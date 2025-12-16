/**
 * AST node definitions for Ragelang
 */

export type ASTNode =
  | Program
  | DrawBlock
  | UpdateBlock
  | IfStatement
  | BlockStatement
  | ExpressionStatement
  | VariableDeclaration
  | AssignmentExpression
  | BinaryExpression
  | UnaryExpression
  | CallExpression
  | MemberExpression
  | Identifier
  | NumberLiteral
  | StringLiteral
  | BooleanLiteral
  | PrototypeExpression;

export interface Program {
  type: 'Program';
  body: Statement[];
}

export type Statement =
  | DrawBlock
  | UpdateBlock
  | IfStatement
  | BlockStatement
  | ExpressionStatement
  | VariableDeclaration;

export type Expression =
  | AssignmentExpression
  | BinaryExpression
  | UnaryExpression
  | CallExpression
  | MemberExpression
  | Identifier
  | NumberLiteral
  | StringLiteral
  | BooleanLiteral
  | PrototypeExpression;

export interface DrawBlock {
  type: 'DrawBlock';
  body: BlockStatement;
}

export interface UpdateBlock {
  type: 'UpdateBlock';
  parameter: string; // dt parameter
  body: BlockStatement;
}

export interface IfStatement {
  type: 'IfStatement';
  condition: Expression;
  consequent: BlockStatement;
  alternate: BlockStatement | IfStatement | null;
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
  left: Identifier | MemberExpression;
  right: Expression;
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
  arguments: Expression[];
}

export interface MemberExpression {
  type: 'MemberExpression';
  object: Expression;
  property: Identifier;
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

export interface PrototypeExpression {
  type: 'PrototypeExpression';
}

