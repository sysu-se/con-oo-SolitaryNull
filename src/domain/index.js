// @sudoku/domain.js

/**
 * 辅助工具：深度克隆二维数组
 */
const cloneGrid = (grid) => grid.map(row => [...row]);

/**
 * 辅助工具：校验数独规则
 */
export const isValidPlacement = (grid, row, col, value) => {
  if (value === 0 || value === null) return true;

  // 行校验
  for (let i = 0; i < 9; i++) {
    if (i !== col && grid[row][i] === value) return false;
  }
  // 列校验
  for (let i = 0; i < 9; i++) {
    if (i !== row && grid[i][col] === value) return false;
  }
  // 九宫格校验
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const r = startRow + i;
      const c = startCol + j;
      if ((r !== row || c !== col) && grid[r][c] === value) return false;
    }
  }
  return true;
};

class Sudoku {
  constructor(grid) {
    this._validateStructure(grid);
    // 统一内部表示：null 或 undefined 转为 0
    this.grid = grid.map(row => row.map(cell => (cell === null || cell === undefined) ? 0 : cell));
  }

  _validateStructure(grid) {
    if (!Array.isArray(grid) || grid.length !== 9) throw new Error('Grid must be 9x9');
    for (const row of grid) {
      if (!Array.isArray(row) || row.length !== 9) throw new Error('Grid must be 9x9');
    }
  }

  getGrid() {
    return cloneGrid(this.grid);
  }

  /**
   * 修复点 1：恢复对对象参数的支持 { row, col, value }
   * 并保留 validate 开关供 Game 重放历史时使用
   */
  guess(move, validate = false) {
    const { row, col, value: rawValue } = move;
    const value = rawValue === null ? 0 : rawValue; // 统一处理 null

    if (row < 0 || row > 8 || col < 0 || col > 8) throw new Error('Out of bounds');
    if (value < 0 || value > 9) throw new Error('Invalid value');

    if (validate && value !== 0) {
      if (!isValidPlacement(this.grid, row, col, value)) {
        throw new Error(`Invalid move at [${row}, ${col}]`);
      }
    }
    this.grid[row][col] = value;
  }

  /**
   * 修复点 2：恢复测试要求的 clone() 方法
   */
  clone() {
    return new Sudoku(this.getGrid());
  }

  isComplete() {
        // 1. 检查是否填满
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (this.grid[r][c] === 0) return false;
            }
        }

        // 2. 检查是否存在任何冲突
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                // 借用你写好的校验函数，验证每个格子在当前棋盘下是否合法
                if (!isValidPlacement(this.grid, r, c, this.grid[r][c])) {
                    return false;
                }
            }
        }
        return true;
    }

  toJSON() {
    return { grid: this.getGrid() };
  }

  toString() {
    let str = '';
    for (let row = 0; row < 9; row++) {
      if (row % 3 === 0 && row !== 0) str += '------+-------+------\n';
      for (let col = 0; col < 9; col++) {
        if (col % 3 === 0 && col !== 0) str += '| ';
        const val = this.grid[row][col];
        str += (val === 0 ? '.' : val) + ' ';
      }
      str += '\n';
    }
    return str;
  }
}

class Game {
  constructor(sudoku) {
    this.initialGrid = sudoku.getGrid();
    this.moves = [];
    this.historyIndex = 0;
    // 维护当前状态，确保“即时校验”
    this.currentSudoku = new Sudoku(this.initialGrid);
  }

  isInitialCell(row, col) {
    return this.initialGrid[row][col] !== 0;
  }

  getSudoku() {
    // 返回副本，防止外部修改
    return this.currentSudoku.clone();
  }

  guess(move, validate = false) {
    if (this.isInitialCell(move.row, move.col)) {
      throw new Error('Cannot modify initial cells');
    }

    // 1. 先在当前棋盘尝试，失败会抛出异常，阻止 move 进入历史
    this.currentSudoku.guess(move, validate);

    // 2. 校验通过，记录历史
    this.moves = this.moves.slice(0, this.historyIndex);
    this.moves.push({ ...move });
    this.historyIndex++;
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this._rebuild();
    }
  }

  redo() {
    if (this.historyIndex < this.moves.length) {
      this.historyIndex++;
      this._rebuild();
    }
  }

  _rebuild() {
    const sudoku = new Sudoku(this.initialGrid);
    for (let i = 0; i < this.historyIndex; i++) {
      sudoku.guess(this.moves[i], false); // 重放不需要再次校验冲突
    }
    this.currentSudoku = sudoku;
  }

  canUndo() { return this.historyIndex > 0; }
  canRedo() { return this.historyIndex < this.moves.length; }
  isComplete() { return this.currentSudoku.isComplete(); }

  toJSON() {
    return {
      initialGrid: cloneGrid(this.initialGrid),
      moves: this.moves.map(m => ({ ...m })),
      historyIndex: this.historyIndex
    };
  }
}

// --- 工厂函数 ---

export function createSudoku(grid) {
  return new Sudoku(grid);
}

export function createSudokuFromJSON(json) {
  if (!json || !json.grid) throw new Error('Invalid JSON');
  return new Sudoku(json.grid);
}

export function createGame({ sudoku }) {
  return new Game(sudoku);
}

export function createGameFromJSON(json) {
  if (!json || !json.initialGrid) throw new Error('Invalid JSON');
  const game = new Game(new Sudoku(json.initialGrid));
  game.moves = (json.moves || []).map(m => ({ ...m }));
  game.historyIndex = json.historyIndex !== undefined ? json.historyIndex : game.moves.length;
  game._rebuild();
  return game;
}

