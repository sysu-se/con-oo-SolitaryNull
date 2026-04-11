<script>
	import { onMount } from 'svelte';
	import { validateSencode } from '@sudoku/sencode';
	import game from '@sudoku/game';
	import { modal } from '@sudoku/stores/modal';
	import Board from './components/Board/index.svelte';
	import Controls from './components/Controls/index.svelte';
	import Header from './components/Header/index.svelte';
	import Modal from './components/Modal/index.svelte';
	import { gameStore } from './domain/store.js';
	gameStore.subscribe(state => {
		if (state.isComplete) {
			game.pause(); // 停止计时器
			modal.show('gameover'); // 弹出结束框
		}
	});

	onMount(() => {
		let hash = location.hash;

		if (hash.startsWith('#')) {
			hash = hash.slice(1);
		}

		let sencode;
		if (validateSencode(hash)) {
			sencode = hash;
		}

		modal.show('welcome', { onHide: game.resume, sencode });
	});
</script>

<!-- Timer, Menu, etc. -->
<header>
	<Header />
</header>

<!-- Sudoku Field -->
<section>
	<Board />
</section>

<!-- Keyboard -->
<footer>
	<Controls />
</footer>

<Modal />

<style global>
	@import "./styles/global.css";
</style>