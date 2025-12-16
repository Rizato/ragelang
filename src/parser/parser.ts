import { Token, TokenType } from '../lexer/tokens.js';
import {
  Program,
  Statement,
  Expression,
  DrawBlock,
  UpdateBlock,
  IfStatement,
  BlockStatement,
  ExpressionStatement,
  VariableDeclaration,
  AssignmentExpression,
  BinaryExpression,
  UnaryExpression,
  CallExpression,
  MemberExpression,
  Identifier,
  NumberLiteral,
  StringLiteral,
  BooleanLiteral,
  PrototypeExpression,
} from './ast.js';

/**
 * Parser for Ragelang
 * Converts tokens into an AST
 */
export class Parser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    // Filter out comments and foundation markers for parsing
    this.tokens = tokens.filter(
      t => t.type !== TokenType.COMMENT && t.type !== TokenType.FOUNDATION
    );
  }

  parse(): Program {
    const body: Statement[] = [];

    while (!this.isAtEnd()) {
      const stmt = this.declaration();
      if (stmt) {
        body.push(stmt);
      }
    }

    return { type: 'Program', body };
  }

  private declaration(): Statement | null {
    // Check for draw block
    if (this.check(TokenType.DRAW)) {
      return this.drawBlock();
    }

    // Check for update block
    if (this.check(TokenType.UPDATE)) {
      return this.updateBlock();
    }

    // Check for if statement
    if (this.check(TokenType.IF)) {
      return this.ifStatement();
    }

    // Otherwise it's an expression statement or variable declaration
    return this.expressionStatement();
  }

  private drawBlock(): DrawBlock {
    this.advance(); // consume 'draw'
    this.consume(TokenType.LBRACE, "Expected '{' after 'draw'");
    const body = this.blockStatement();
    return { type: 'DrawBlock', body };
  }

  private updateBlock(): UpdateBlock {
    this.advance(); // consume 'update'
    this.consume(TokenType.LPAREN, "Expected '(' after 'update'");
    const param = this.consume(TokenType.IDENTIFIER, "Expected parameter name");
    this.consume(TokenType.RPAREN, "Expected ')' after parameter");
    this.consume(TokenType.LBRACE, "Expected '{' after 'update(...)'");
    const body = this.blockStatement();
    return { type: 'UpdateBlock', parameter: param.lexeme, body };
  }

  private ifStatement(): IfStatement {
    this.advance(); // consume 'if'
    this.consume(TokenType.LPAREN, "Expected '(' after 'if'");
    const condition = this.expression();
    this.consume(TokenType.RPAREN, "Expected ')' after condition");
    this.consume(TokenType.LBRACE, "Expected '{' after 'if (...)'");
    const consequent = this.blockStatement();

    let alternate: BlockStatement | IfStatement | null = null;
    if (this.match(TokenType.ELSE)) {
      if (this.check(TokenType.IF)) {
        alternate = this.ifStatement();
      } else {
        this.consume(TokenType.LBRACE, "Expected '{' after 'else'");
        alternate = this.blockStatement();
      }
    }

    return { type: 'IfStatement', condition, consequent, alternate };
  }

  private blockStatement(): BlockStatement {
    const statements: Statement[] = [];

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const stmt = this.declaration();
      if (stmt) {
        statements.push(stmt);
      }
    }

    this.consume(TokenType.RBRACE, "Expected '}' after block");
    return { type: 'BlockStatement', body: statements };
  }

  private expressionStatement(): ExpressionStatement | VariableDeclaration | null {
    const expr = this.expression();

    // Check if this is a variable declaration (identifier = expression)
    if (expr.type === 'AssignmentExpression') {
      const assign = expr as AssignmentExpression;
      if (assign.left.type === 'Identifier') {
        return {
          type: 'VariableDeclaration',
          name: (assign.left as Identifier).name,
          init: assign.right,
        };
      }
    }

    return { type: 'ExpressionStatement', expression: expr };
  }

  private expression(): Expression {
    return this.assignment();
  }

  private assignment(): Expression {
    const expr = this.or();

    if (this.match(TokenType.EQUAL)) {
      const value = this.assignment();

      if (expr.type === 'Identifier' || expr.type === 'MemberExpression') {
        return {
          type: 'AssignmentExpression',
          left: expr as Identifier | MemberExpression,
          right: value,
        };
      }

      throw new Error('Invalid assignment target');
    }

    return expr;
  }

  private or(): Expression {
    let expr = this.and();

    while (this.match(TokenType.OR)) {
      const right = this.and();
      expr = {
        type: 'BinaryExpression',
        operator: 'or',
        left: expr,
        right,
      };
    }

    return expr;
  }

  private and(): Expression {
    let expr = this.equality();

    while (this.match(TokenType.AND)) {
      const right = this.equality();
      expr = {
        type: 'BinaryExpression',
        operator: 'and',
        left: expr,
        right,
      };
    }

    return expr;
  }

  private equality(): Expression {
    let expr = this.comparison();

    while (this.match(TokenType.EQUAL_EQUAL, TokenType.BANG_EQUAL)) {
      const operator = this.previous().lexeme;
      const right = this.comparison();
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right,
      };
    }

    return expr;
  }

  private comparison(): Expression {
    let expr = this.term();

    while (this.match(TokenType.LESS, TokenType.LESS_EQUAL, TokenType.GREATER, TokenType.GREATER_EQUAL)) {
      const operator = this.previous().lexeme;
      const right = this.term();
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right,
      };
    }

    return expr;
  }

  private term(): Expression {
    let expr = this.factor();

    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.previous().lexeme;
      const right = this.factor();
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right,
      };
    }

    return expr;
  }

  private factor(): Expression {
    let expr = this.unary();

    while (this.match(TokenType.STAR, TokenType.SLASH, TokenType.PERCENT)) {
      const operator = this.previous().lexeme;
      const right = this.unary();
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right,
      };
    }

    return expr;
  }

  private unary(): Expression {
    if (this.match(TokenType.BANG, TokenType.MINUS)) {
      const operator = this.previous().lexeme;
      const argument = this.unary();
      return {
        type: 'UnaryExpression',
        operator,
        argument,
      };
    }

    return this.call();
  }

  private call(): Expression {
    let expr = this.primary();

    while (true) {
      if (this.match(TokenType.LPAREN)) {
        expr = this.finishCall(expr);
      } else if (this.match(TokenType.DOT)) {
        const name = this.consume(TokenType.IDENTIFIER, "Expected property name after '.'");
        expr = {
          type: 'MemberExpression',
          object: expr,
          property: { type: 'Identifier', name: name.lexeme },
        };
      } else {
        break;
      }
    }

    return expr;
  }

  private finishCall(callee: Expression): CallExpression {
    const args: Expression[] = [];

    if (!this.check(TokenType.RPAREN)) {
      do {
        args.push(this.expression());
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RPAREN, "Expected ')' after arguments");

    return {
      type: 'CallExpression',
      callee,
      arguments: args,
    };
  }

  private primary(): Expression {
    if (this.match(TokenType.TRUE)) {
      return { type: 'BooleanLiteral', value: true };
    }

    if (this.match(TokenType.FALSE)) {
      return { type: 'BooleanLiteral', value: false };
    }

    if (this.match(TokenType.NUMBER)) {
      return { type: 'NumberLiteral', value: this.previous().literal as number };
    }

    if (this.match(TokenType.STRING)) {
      return { type: 'StringLiteral', value: this.previous().literal as string };
    }

    if (this.match(TokenType.PROTOTYPE)) {
      this.consume(TokenType.LPAREN, "Expected '(' after 'prototype'");
      this.consume(TokenType.RPAREN, "Expected ')' after 'prototype('");
      return { type: 'PrototypeExpression' };
    }

    if (this.match(TokenType.IDENTIFIER)) {
      return { type: 'Identifier', name: this.previous().lexeme };
    }

    if (this.match(TokenType.LPAREN)) {
      const expr = this.expression();
      this.consume(TokenType.RPAREN, "Expected ')' after expression");
      return expr;
    }

    throw new Error(`Unexpected token: ${this.peek().lexeme} at line ${this.peek().line}`);
  }

  // Helper methods

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new Error(`${message}. Got: ${this.peek().lexeme} at line ${this.peek().line}`);
  }
}

