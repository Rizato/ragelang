/**
 * AST node definitions for Ragelang
 */

export type ASTNode =
  | Program
  | DrawBlock
  | UpdateBlock
  | FunctionDeclaration
  | EnumDeclaration
  | ReturnStatement
  | IfStatement
  | LoopStatement
  | BreakStatement
  | BlockStatement
  | ExpressionStatement
  | VariableDeclaration
  | AssignmentExpression
  | BinaryExpression
  | UnaryExpression
  | UpdateExpression
  | CallExpression
  | MemberExpression
  | IndexExpression
  | SliceExpression
  | Identifier
  | NumberLiteral
  | StringLiteral
  | BooleanLiteral
  | ArrayLiteral
  | ObjectLiteral
  | PrototypeExpression
  | MatchExpression;

export interface Program {
  type: 'Program';
  body: Statement[];
}

export type Statement =
  | DrawBlock
  | UpdateBlock
  | FunctionDeclaration
  | EnumDeclaration
  | ReturnStatement
  | IfStatement
  | LoopStatement
  | BreakStatement
  | BlockStatement
  | ExpressionStatement
  | VariableDeclaration;

export type Expression =
  | AssignmentExpression
  | BinaryExpression
  | UnaryExpression
  | UpdateExpression
  | CallExpression
  | MemberExpression
  | IndexExpression
  | SliceExpression
  | Identifier
  | NumberLiteral
  | StringLiteral
  | BooleanLiteral
  | ArrayLiteral
  | ObjectLiteral
  | PrototypeExpression
  | MatchExpression;

export interface DrawBlock {
  type: 'DrawBlock';
  body: BlockStatement;
}

export interface UpdateBlock {
  type: 'UpdateBlock';
  parameter: string; // dt parameter
  body: BlockStatement;
}

export interface FunctionDeclaration {
  type: 'FunctionDeclaration';
  name: string;
  parameters: string[];
  body: BlockStatement;
}

export interface ReturnStatement {
  type: 'ReturnStatement';
  argument: Expression | null;
}

export interface IfStatement {
  type: 'IfStatement';
  condition: Expression;
  consequent: BlockStatement;
  alternate: BlockStatement | IfStatement | null;
}

export interface LoopStatement {
  type: 'LoopStatement';
  body: BlockStatement;
}

export interface BreakStatement {
  type: 'BreakStatement';
}

export interface BlockStatement {
  type: 'BlockStatement';
  body: Statement[];
}

export interface ExpressionStatement {
  type: 'ExpressionStatement';
  expression: Expression;
}

export interface VariableDeclaration {
  type: 'VariableDeclaration';
  name: string;
  init: Expression;
}

export interface AssignmentExpression {
  type: 'AssignmentExpression';
  operator: '=' | '+=' | '-=' | '*=' | '/=' | '%=' | '&=' | '|=' | '^=';
  left: Identifier | MemberExpression | IndexExpression;
  right: Expression;
}

// Update expression for ++/-- operators
export interface UpdateExpression {
  type: 'UpdateExpression';
  operator: '++' | '--';
  argument: Identifier | MemberExpression | IndexExpression;
  prefix: boolean; // true for ++x, false for x++
}

export interface BinaryExpression {
  type: 'BinaryExpression';
  operator: string;
  left: Expression;
  right: Expression;
}

export interface UnaryExpression {
  type: 'UnaryExpression';
  operator: string;
  argument: Expression;
}

export interface CallExpression {
  type: 'CallExpression';
  callee: Expression;
  arguments: CallArgument[];
}

// Call argument can be positional or keyword
export interface CallArgument {
  name: string | null;  // null for positional, string for keyword
  value: Expression;
}

export interface MemberExpression {
  type: 'MemberExpression';
  object: Expression;
  property: Identifier;
}

export interface IndexExpression {
  type: 'IndexExpression';
  object: Expression;
  index: Expression;
}

// Slice expression: arr[start:end] or arr[start:] or arr[:end] or arr[:]
export interface SliceExpression {
  type: 'SliceExpression';
  object: Expression;
  start: Expression | null;  // null means from beginning
  end: Expression | null;    // null means to end
}

export interface Identifier {
  type: 'Identifier';
  name: string;
}

export interface NumberLiteral {
  type: 'NumberLiteral';
  value: number;
}

export interface StringLiteral {
  type: 'StringLiteral';
  value: string;
}

export interface BooleanLiteral {
  type: 'BooleanLiteral';
  value: boolean;
}

export interface ArrayLiteral {
  type: 'ArrayLiteral';
  elements: Expression[];
}

export interface PrototypeExpression {
  type: 'PrototypeExpression';
}

// Object literal: {key: value, key2: value2}
export interface ObjectLiteral {
  type: 'ObjectLiteral';
  properties: ObjectProperty[];
}

export interface ObjectProperty {
  key: string;
  value: Expression;
}

// Enum declaration: enum State { Idle, Running(speed), Jumping(height, velocity) }
export interface EnumDeclaration {
  type: 'EnumDeclaration';
  name: string;
  variants: EnumVariant[];
}

export interface EnumVariant {
  name: string;
  fields: string[];  // Empty for unit variants, field names for data variants
}

// Match expression with pattern matching
export interface MatchExpression {
  type: 'MatchExpression';
  subject: Expression;
  arms: MatchArm[];
}

export interface MatchArm {
  pattern: Pattern;
  body: Expression;
}

// Pattern types for match expressions
export type Pattern =
  | WildcardPattern      // _
  | LiteralPattern       // 42, "hello", true
  | IdentifierPattern    // x (binds to value)
  | VariantPattern;      // SomeEnum::Variant(x, y)

export interface WildcardPattern {
  type: 'WildcardPattern';
}

export interface LiteralPattern {
  type: 'LiteralPattern';
  value: number | string | boolean;
}

export interface IdentifierPattern {
  type: 'IdentifierPattern';
  name: string;
}

export interface VariantPattern {
  type: 'VariantPattern';
  enumName: string | null;  // Optional enum name (for fully qualified)
  variantName: string;
  bindings: string[];  // Names to bind extracted values to
}
