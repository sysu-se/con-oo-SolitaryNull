# con-oo-SolitaryNull - Review

## Review 结论

当前实现已经把 Sudoku/Game 接入了部分主流程，但还没有把 Svelte 游戏流程真正收敛到同一个领域状态源上。主棋盘渲染、基础输入、Undo/Redo 已开始走 gameStore；但提示、笔记、自定义难度、部分暂停/恢复等流程仍依赖旧 store，导致设计上是“部分接入、双轨并存”，离作业要求中的完整领域接入还有明显差距。

## 总体评价

| 维度 | 评价 |
| --- | --- |
| OOP | fair |
| JS Convention | fair |
| Sudoku Business | fair |
| OOD | fair |

## 缺点

### 1. 适配层没有收敛为唯一状态源

- 严重程度：core
- 位置：src/domain/store.js:95-101
- 原因：gameStore 在创建新局时仍主动把题面同步回 legacyGridStore，并依赖 legacyDifficultyStore 维护界面状态；这说明 UI 仍然有一部分真实依赖旧的 @sudoku/stores/*。结果是领域对象并没有成为唯一事实来源，Svelte 层继续维持并行状态，后续很容易出现渲染、提示、分享、统计彼此不一致。

### 2. 提示流程绕过了 Game/Sudoku

- 严重程度：core
- 位置：src/components/Controls/ActionBar/Actions.svelte:13-20
- 原因：handleHint 直接调用旧的 userGrid.applyHint()，而棋盘渲染、完成判定、Undo/Redo 已经切到 gameStore。这样提示既不会进入 Game 的历史，也不会更新当前由 $gameStore.grid 驱动的棋盘，业务上形成了两套不一致的游戏状态。

### 3. 笔记候选数没有接回当前棋盘渲染

- 严重程度：major
- 位置：src/components/Board/index.svelte:44-53
- 原因：键盘在 notes 模式下仍写入 candidates store，但 Board 渲染 Cell 时没有把 candidates 传进去，Cell 中的候选数分支实际上不会被命中。结果是笔记功能停留在旧 store 里，既没有进入领域对象，也没有真正反馈到当前视图。

### 4. 自定义题目没有把难度元数据切到 custom

- 严重程度：major
- 位置：src/domain/store.js:115-132
- 原因：startCustom 创建了新的 Game，但没有调用 difficulty store 的 setCustom 之类接口，导致下拉菜单、结束弹窗等仍可能显示上一局难度。这是典型的游戏会话元数据未和领域会话一起切换的问题。

### 5. 新开局流程没有完整重置会话级状态

- 严重程度：major
- 位置：src/domain/store.js:81-132
- 原因：新局流程只重置了 timer 和暂停状态，没有重置 cursor、hints 等与一局游戏绑定的状态。静态对比现有组件依赖可见，这会让新局继承上一局的选中格或提示计数，说明 Svelte 游戏生命周期没有被 gameStore 完整接管。

### 6. Svelte 适配层直接读取并暴露 Game 内部字段

- 严重程度：major
- 位置：src/domain/store.js:56-60
- 原因：sync() 直接访问 gameInstance.initialGrid，并把该数组引用暴露给 store 状态，而不是通过 Game 的显式导出接口获取只读视图。这削弱了封装边界，使 UI 适配层与领域对象的内部表示强耦合，不是很好的 OOD。

### 7. 迁移过程中残留未定义引用

- 严重程度：minor
- 位置：src/components/Header/Dropdown.svelte:30-35
- 原因：Create Own 分支里写了 onHide: game.resume，但当前文件并没有导入 game。这个问题说明新旧接入方式混用后没有完全清理，属于明显的静态质量缺陷。

## 优点

### 1. Sudoku 的核心规则已经集中到领域对象内部

- 位置：src/domain/index.js:47-159
- 原因：棋盘持有、落子、合法性校验、完成判定、序列化都集中在 Sudoku 中，而不是散落在组件事件里，整体方向符合把业务规则从 View 中抽离的 OOP 思路。

### 2. Undo/Redo 被放回了 Game 统一管理

- 位置：src/domain/index.js:220-264
- 原因：历史记录、historyIndex、rebuild 回放都在 Game 内部完成，组件只需要调用 undo/redo，职责边界明显优于把撤销重做逻辑写在 Svelte 组件里。

### 3. 领域对象对外做了防御性拷贝

- 位置：src/domain/index.js:76-78
- 原因：getGrid() 返回深拷贝，Game.getSudoku() 也返回克隆对象，降低了 UI 直接 mutate 领域内部状态的风险。

### 4. 已经建立了面向 Svelte 的领域适配层

- 位置：src/domain/store.js:36-64
- 原因：sync() 把 Game 投影为 grid、canUndo、canRedo、isComplete、invalidCells 这样的响应式视图状态，这比让组件直接触碰领域对象内部字段更接近推荐的 store adapter 方案。

### 5. 主输入路径已改为通过领域命令落子

- 位置：src/components/Controls/Keyboard.svelte:17-24
- 原因：普通数字输入不再直接改二维数组，而是调用 gameStore.guess(...) 进入领域层；这说明“用户输入经过 Game/Sudoku”这一主流程已经部分落地。

## 补充说明

- 本次结论仅基于对 src/domain/* 及其关联 Svelte 接入代码的静态阅读；按要求没有运行测试，也没有在浏览器里实际操作界面。
- 关于提示、笔记、自定义难度、新局重置等结论，来自对 gameStore 与旧 @sudoku/stores/* 代码路径的静态比对，属于静态审查判断，不是运行结果。
- 审查范围刻意限制在 src/domain/* 及直接消费这些对象的 Svelte 组件，没有扩展到无关目录。
