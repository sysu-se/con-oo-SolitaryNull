// src/domain/store.js
import { writable } from 'svelte/store';
import { createSudoku, createGame, isValidPlacement } from './index.js';

// 导入原有的生成算法和解码工具
import { generateSudoku } from '@sudoku/sudoku';
import { decodeSencode } from '@sudoku/sencode';

// 导入原有的旧 Store，用于保持系统兼容（如计时器和题目显示）
import { grid as legacyGridStore  } from '@sudoku/stores/grid';
import { gamePaused } from '@sudoku/stores/game'; // 注意：根据你提供的代码，gamePaused 在 @sudoku/game 中
import { timer } from '@sudoku/stores/timer'; 
function createGameStore() {
	const { subscribe, set, update } = writable({
		grid: Array(9).fill(0).map(() => Array(9).fill(0)),
		initialGrid: Array(9).fill(0).map(() => Array(9).fill(0)),
		canUndo: false,
		canRedo: false,
		isComplete: false,
		invalidCells: []
	});

	let gameInstance = null;

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
		// 接管新游戏开始逻辑
		startNew(difficulty) {
			try {
                const puzzle = generateSudoku(difficulty);
                gameInstance = createGame({ sudoku: createSudoku(puzzle) });

                // 1. 重置计时器为 0
                if (timer) {
                    timer.reset(); // 先重置
                    timer.start(); // 再开始
                }

                // 2. 更新旧系统的题面（确保 UI 显示正确）
                if (legacyGridStore && legacyGridStore.set) {
                    legacyGridStore.set(puzzle);
                }

                // 3. 开始游戏（解除暂停，计时器开始跑）
                gamePaused.set(false); 
                
                sync();
            } catch (e) {
                console.error("StartNew Error:", e);
            }
		},
		// 接管自定义/分享码加载逻辑
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
		guess(row, col, value) {
			if (!gameInstance) return;
			try {
				gameInstance.guess({ row, col, value }, false);
				sync();
			} catch (e) { console.warn(e.message); }
		},
		undo() { if (gameInstance) { gameInstance.undo(); sync(); } },
		redo() { if (gameInstance) { gameInstance.redo(); sync(); } }
	};
}

export const gameStore = createGameStore();