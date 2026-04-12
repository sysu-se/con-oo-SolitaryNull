// src/domain/store.js

import { writable } from 'svelte/store';
import { createSudoku, createGame, isValidPlacement } from './index.js';

// 导入原有的生成算法和解码工具
import { generateSudoku } from '@sudoku/sudoku';
import { decodeSencode } from '@sudoku/sencode';
import { grid as legacyGridStore } from '@sudoku/stores/grid';
import { gamePaused } from '@sudoku/stores/game';
import { timer } from '@sudoku/stores/timer';
import { difficulty as legacyDifficultyStore } from '@sudoku/stores/difficulty';
/**
 * 创建游戏状态存储（Svelte Store）
 * 管理当前游戏实例、棋盘数据、撤销/重做状态、完成标志及冲突单元格列表
 * @returns {Object} 包含 subscribe 及游戏操作方法的 store 对象
 */
function createGameStore() {
	// 内部 store 状态：棋盘、初始棋盘、可撤销/重做标志、完成标志、冲突单元格坐标数组
	const { subscribe, set, update } = writable({
		grid: Array(9).fill(0).map(() => Array(9).fill(0)),
		initialGrid: Array(9).fill(0).map(() => Array(9).fill(0)),
		canUndo: false,
		canRedo: false,
		isComplete: false,
		invalidCells: []
	});

	/** @type {import('./index.js').Game | null} 当前游戏实例 */
	let gameInstance = null;

	/**
	 * 同步 store 状态与当前 gameInstance
	 * 获取最新棋盘、计算冲突单元格、更新所有状态字段
	 */
	const sync = () => {
		if (!gameInstance) return;
		const sudoku = gameInstance.getSudoku();
		const currentGrid = sudoku.getGrid();
		const isComplete = gameInstance.isComplete();
		// 计算冲突项（用于标红）
		const invalidCells = [];
		for (let r = 0; r < 9; r++) {
			for (let c = 0; c < 9; c++) {
				const val = currentGrid[r][c];
				if (val !== 0) {
					const tempGrid = currentGrid.map(row => [...row]);
					tempGrid[r][c] = 0;
					if (!isValidPlacement(tempGrid, r, c, val)) {
						invalidCells.push(`${c},${r}`);
					}
				}
			}
		}

		set({
			grid: currentGrid,
			initialGrid: gameInstance.initialGrid,
			canUndo: gameInstance.canUndo(),
			canRedo: gameInstance.canRedo(),
			isComplete: isComplete,
			invalidCells
		});
	};

	return {
		subscribe,
        pause() {
            gamePaused.set(true);
            timer.stop();
        },

        resume() {
            gamePaused.set(false);
            timer.start();
        },
		/**
		 * 开始新游戏（根据难度生成题目）
		 * @param {string} difficulty - 难度级别（如 'easy', 'medium', 'hard'）
		 */
		startNew(difficulty) {
            console.log("正在切换难度至:", difficulty);
			try {
				const puzzle = generateSudoku(difficulty);
				gameInstance = createGame({ sudoku: createSudoku(puzzle) });

				// 1. 重置计时器为 0
				// if (timer) {
				// 	timer.reset();
				// 	timer.start();
				// }
                timer.reset();
                this.resume();

				// 2. 更新旧系统的题面（确保 UI 显示正确）
				if (legacyGridStore && legacyGridStore.set) {
					legacyGridStore.set(puzzle);
                    console.log("Legacy grid store updated with new puzzle.");
				}
                if (legacyDifficultyStore && legacyDifficultyStore.set) {
                    legacyDifficultyStore.set(difficulty);
                }
				// 3. 开始游戏（解除暂停，计时器开始跑）
				gamePaused.set(false);

				sync();
			} catch (e) {
				console.error("StartNew Error:", e);
			}
		},
		/**
		 * 通过分享码（Sencode）开始自定义游戏
		 * @param {string} sencode - 编码后的数独字符串
		 */
		startCustom(sencode) {
			try {
				const puzzle = decodeSencode(sencode);
				gameInstance = createGame({ sudoku: createSudoku(puzzle) });

				// 1. 重置计时器
				if (timer) {
					timer.reset();
					timer.start();
				}

				if (legacyGridStore && legacyGridStore.set) {
					legacyGridStore.set(puzzle);
				}

				gamePaused.set(false);

				sync();
			} catch (e) {
				console.error("StartCustom Error:", e);
			}
		},
		/**
		 * 执行一次猜数操作
		 * @param {number} row - 行索引 (0-8)
		 * @param {number} col - 列索引 (0-8)
		 * @param {number|null} value - 填入的数字 (1-9) 或 null/0 表示清除
		 */
		guess(row, col, value) {
			if (!gameInstance) return;
			try {
				gameInstance.guess({ row, col, value }, false);
				sync();
			} catch (e) { console.warn(e.message); }
		},
		/** 撤销上一步操作 */
		undo() { if (gameInstance) { gameInstance.undo(); sync(); } },
		/** 重做下一步操作 */
		redo() { if (gameInstance) { gameInstance.redo(); sync(); } }
	};
}

/** 导出的游戏状态 Store 单例 */
export const gameStore = createGameStore();