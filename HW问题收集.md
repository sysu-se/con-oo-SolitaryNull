## HW 问题收集

### 已解决

1. 为什么 `$:` 声明有时不更新？
   1. **上下文**：

```html
<script>
  import { gameStore } from '../../domain/store.js';
  let myGame = $gameStore.gameInstance; 
  // ❌ 这里的 won 永远不会自动更新
  $: won = myGame.isComplete(); 
</script>
<p>游戏状态：{won ? '赢了' : '进行中'}</p>
```

   2. **解决手段**：直接询问LLM + 查看网页资料
   3. **解答**： 对于这段代码，LLM反馈说不更新的原因是，当你落子时，虽然 myGame 内部的棋盘变了，但 myGame 这个变量的引用（内存地址）没变。Svelte 认为 myGame 还是原来那个对象，所以它不会去重新执行 myGame.isComplete()。
1. `sync()`的作用是什么?
   1. **上下文**：

```html
// store.js 内部
const sync = () => {
    // ...
    set({
        grid: currentGrid, // 这是一个新数组副本
        isComplete: gameInstance.isComplete(), // 这是一个新的布尔值
        // ...
    });
};
```


   2. **解决手段**：测试运行并询问LLM
   3. **解答**： 这其实是通过适配器的 sync() 函数将结果“投影”为扁平的 Store 属性。因为我们在 sync 里给整个 Store 赋了一个全新的对象快照。Svelte 监测到了 `$gameStore` 指向了新地址，所以所有依赖 `$gameStore` 的 UI 和 `$`: 都会重跑。

### 未解决

1. 重构代码之后行/列/宫高亮功能不能正常工作

   1. **上下文**：`src/components/Board/Cell.svelte`

      ```javascript
      <div class="cell row-start-{cellY} col-start-{cellX}"
         class:border-r={borderRight}
         class:border-r-4={borderRightBold}
         class:border-b={borderBottom}
         class:border-b-4={borderBottomBold}
      </div>
      ```

   2. **尝试解决手段**：问LLM未果

2. 目前的设计，如果需要加入hint和数独求解器功能，合不合适？

   1. **上下文**：`\src\domain\index.js`
   2. **尝试解决手段**： 尚未实现。