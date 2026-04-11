<script>
	import { BOX_SIZE } from '@sudoku/constants';
	import { gamePaused } from '@sudoku/stores/game';
	import { gameStore } from '../../domain/store.js';
	import { settings } from '@sudoku/stores/settings';
	import { cursor } from '@sudoku/stores/cursor';
	import { candidates } from '@sudoku/stores/candidates';
	import Cell from './Cell.svelte';

	function isSelected(cursorStore, x, y) {
		return cursorStore.x === x && cursorStore.y === y;
	}

	function isSameArea(cursorStore, x, y) {
		if (cursorStore.x === null && cursorStore.y === null) return false;
		if (cursorStore.x === x || cursorStore.y === y) return true;

		const cursorBoxX = Math.floor(cursorStore.x / BOX_SIZE);
		const cursorBoxY = Math.floor(cursorStore.y / BOX_SIZE);
		const cellBoxX = Math.floor(x / BOX_SIZE);
		const cellBoxY = Math.floor(y / BOX_SIZE);
		return (cursorBoxX === cellBoxX && cursorBoxY === cellBoxY);
	}

	function getValueAtCursor(gridStore, cursorStore) {
		if (cursorStore.x === null && cursorStore.y === null) return null;

		return gridStore[cursorStore.y][cursorStore.x];
	}
</script>

<div class="board-padding relative z-10">
	<!-- 这个 div 通过 padding-top: 100% 撑开一个正方形区域 -->
	<div class="max-w-xl mx-auto relative">
		<div class="w-full" style="padding-top: 100%"></div>
        
        <!-- 下面这个是真正的网格承载层，必须 absolute 且 inset-0 撑满上面的正方形 -->
        <div class="absolute inset-0 flex justify-center">
            <div 
                class="bg-white shadow-2xl rounded-xl overflow-hidden w-full h-full max-w-xl grid" 
                style="display: grid; grid-template-columns: repeat(9, 1fr); grid-template-rows: repeat(9, 1fr); height: 100%; width: 100%;"
                class:bg-gray-200={$gamePaused}
            >
                {#each $gameStore.grid as row, y}
                    {#each row as value, x}
                        <Cell 
                            {value}
                            cellY={y + 1}
                            cellX={x + 1}
                            selected={$cursor.x === x && $cursor.y === y}
							conflictingNumber={$settings.highlightConflicting && $gameStore.invalidCells.includes(x + ',' + y)}
							userNumber={$gameStore.initialGrid[y][x] === 0 && value !== 0}
                        />
                    {/each}
                {/each}
            </div>
        </div>
	</div>
</div>

<style>
	.board-padding {
		@apply px-4 pb-4;
	}
</style>