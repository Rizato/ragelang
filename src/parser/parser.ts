import { Token, TokenType } from '../lexer/tokens.js';
import type {
  Program,
  Statement,
  Expression,
  DrawBlock,
  UpdateBlock,
  FunctionDeclaration,
  EnumDeclaration,
  EnumVariant,
  ReturnStatement,
  IfStatement,
  LoopStatement,
  BreakStatement,
  BlockStatement,
  ExpressionStatement,
  VariableDeclaration,
  AssignmentExpression,
  CallExpression,
  MemberExpression,
  IndexExpression,
  ObjectLiteral,
  ObjectProperty,
  MatchExpression,
  MatchArm,
  Pattern,
  Identifier,
} from './ast.js';

/**
 * Parser for Ragelang
 * Converts tokens into an AST
 * 
 * Operator Precedence (lowest to highest):
 * 1. || or (logical or)
 * 2. && and (logical and)
 * 3. | (bitwise or)
 * 4. ^ (bitwise xor)
 * 5. & (bitwise and)
 * 6. ==, != (equality)
 * 7. <, <=, >, >= (comparison)
 * 8. <<, >> (shift)
 * 9. +, - (additive)
 * 10. *, /, % (multiplicative)
 * 11. ** (exponentiation) - right associative
 * 12. Unary: !, -, ~
 * 13. Call, Member access
 * 14. Primary
 */
export class Parser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    // Filter out comments, foundation markers, and newlines for parsing
    this.tokens = tokens.filter(
      t => t.type !== TokenType.COMMENT && 
           t.type !== TokenType.FOUNDATION &&
           t.type !== TokenType.NEWLINE
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

    // Check for function declaration
    if (this.check(TokenType.FUN)) {
      return this.functionDeclaration();
    }

    // Check for enum declaration
    if (this.check(TokenType.ENUM)) {
      return this.enumDeclaration();
    }

    // Check for return statement
    if (this.check(TokenType.RETURN)) {
      return this.returnStatement();
    }

    // Check for if statement
    if (this.check(TokenType.IF)) {
      return this.ifStatement();
    }

    // Check for loop statement
    if (this.check(TokenType.LOOP)) {
      return this.loopStatement();
    }

    // Check for break statement
    if (this.check(TokenType.BREAK)) {
      return this.breakStatement();
    }

    // Otherwise it's an expression statement or variable declaration
    return this.expressionStatement();
  }

  private functionDeclaration(): FunctionDeclaration {
    this.advance(); // consume 'fun'
    const name = this.consume(TokenType.IDENTIFIER, "Expected function name");
    this.consume(TokenType.LPAREN, "Expected '(' after function name");
    
    const parameters: string[] = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        const param = this.consume(TokenType.IDENTIFIER, "Expected parameter name");
        parameters.push(param.lexeme);
      } while (this.match(TokenType.COMMA));
    }
    
    this.consume(TokenType.RPAREN, "Expected ')' after parameters");
    this.consume(TokenType.LBRACE, "Expected '{' before function body");
    const body = this.blockStatement();
    
    return {
      type: 'FunctionDeclaration',
      name: name.lexeme,
      parameters,
      body,
    };
  }

  private returnStatement(): ReturnStatement {
    this.advance(); // consume 'return'
    
    // Check if there's a return value (not immediately followed by } or end)
    let argument: Expression | null = null;
    if (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      argument = this.expression();
    }
    
    return { type: 'ReturnStatement', argument };
  }

  private loopStatement(): LoopStatement {
    this.advance(); // consume 'loop'
    this.consume(TokenType.LBRACE, "Expected '{' after 'loop'");
    const body = this.blockStatement();
    
    return { type: 'LoopStatement', body };
  }

  private breakStatement(): BreakStatement {
    this.advance(); // consume 'break'
    return { type: 'BreakStatement' };
  }

  private enumDeclaration(): EnumDeclaration {
    this.advance(); // consume 'enum'
    const name = this.consume(TokenType.IDENTIFIER, "Expected enum name");
    this.consume(TokenType.LBRACE, "Expected '{' after enum name");
    
    const variants: EnumVariant[] = [];
    
    if (!this.check(TokenType.RBRACE)) {
      do {
        const variantName = this.consume(TokenType.IDENTIFIER, "Expected variant name");
        const fields: string[] = [];
        
        // Check for variant with data: Variant(field1, field2)
        if (this.match(TokenType.LPAREN)) {
          if (!this.check(TokenType.RPAREN)) {
            do {
              const field = this.consume(TokenType.IDENTIFIER, "Expected field name");
              fields.push(field.lexeme);
            } while (this.match(TokenType.COMMA));
          }
          this.consume(TokenType.RPAREN, "Expected ')' after variant fields");
        }
        
        variants.push({ name: variantName.lexeme, fields });
      } while (this.match(TokenType.COMMA));
    }
    
    this.consume(TokenType.RBRACE, "Expected '}' after enum variants");
    
    return {
      type: 'EnumDeclaration',
      name: name.lexeme,
      variants,
    };
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
    // Only convert to VariableDeclaration for simple assignment (=), not compound (+=, -=, etc.)
    if (expr.type === 'AssignmentExpression') {
      const assign = expr as AssignmentExpression;
      if (assign.left.type === 'Identifier' && assign.operator === '=') {
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
    const expr = this.logicalOr();

    // Check for all assignment operators
    if (this.match(
      TokenType.EQUAL,
      TokenType.PLUS_EQUAL,
      TokenType.MINUS_EQUAL,
      TokenType.STAR_EQUAL,
      TokenType.SLASH_EQUAL,
      TokenType.PERCENT_EQUAL,
      TokenType.AMPERSAND_EQUAL,
      TokenType.PIPE_EQUAL,
      TokenType.CARET_EQUAL
    )) {
      const operatorToken = this.previous();
      const operatorMap: Record<string, AssignmentExpression['operator']> = {
        [TokenType.EQUAL]: '=',
        [TokenType.PLUS_EQUAL]: '+=',
        [TokenType.MINUS_EQUAL]: '-=',
        [TokenType.STAR_EQUAL]: '*=',
        [TokenType.SLASH_EQUAL]: '/=',
        [TokenType.PERCENT_EQUAL]: '%=',
        [TokenType.AMPERSAND_EQUAL]: '&=',
        [TokenType.PIPE_EQUAL]: '|=',
        [TokenType.CARET_EQUAL]: '^=',
      };
      const operator = operatorMap[operatorToken.type];
      const value = this.assignment();

      if (expr.type === 'Identifier' || expr.type === 'MemberExpression' || expr.type === 'IndexExpression') {
        return {
          type: 'AssignmentExpression',
          operator,
          left: expr as Identifier | MemberExpression | IndexExpression,
          right: value,
        };
      }

      throw new Error('Invalid assignment target');
    }

    return expr;
  }

  // Logical OR: || or 'or' keyword
  private logicalOr(): Expression {
    let expr = this.logicalAnd();

    while (this.match(TokenType.OR, TokenType.PIPE_PIPE)) {
      const operator = this.previous().type === TokenType.OR ? 'or' : '||';
      const right = this.logicalAnd();
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right,
      };
    }

    return expr;
  }

  // Logical AND: && or 'and' keyword
  private logicalAnd(): Expression {
    let expr = this.bitwiseOr();

    while (this.match(TokenType.AND, TokenType.AMPERSAND_AMPERSAND)) {
      const operator = this.previous().type === TokenType.AND ? 'and' : '&&';
      const right = this.bitwiseOr();
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right,
      };
    }

    return expr;
  }

  // Bitwise OR: |
  private bitwiseOr(): Expression {
    let expr = this.bitwiseXor();

    while (this.match(TokenType.PIPE)) {
      const right = this.bitwiseXor();
      expr = {
        type: 'BinaryExpression',
        operator: '|',
        left: expr,
        right,
      };
    }

    return expr;
  }

  // Bitwise XOR: ^
  private bitwiseXor(): Expression {
    let expr = this.bitwiseAnd();

    while (this.match(TokenType.CARET)) {
      const right = this.bitwiseAnd();
      expr = {
        type: 'BinaryExpression',
        operator: '^',
        left: expr,
        right,
      };
    }

    return expr;
  }

  // Bitwise AND: &
  private bitwiseAnd(): Expression {
    let expr = this.equality();

    while (this.match(TokenType.AMPERSAND)) {
      const right = this.equality();
      expr = {
        type: 'BinaryExpression',
        operator: '&',
        left: expr,
        right,
      };
    }

    return expr;
  }

  // Equality: ==, !=
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

  // Comparison: <, <=, >, >=
  private comparison(): Expression {
    let expr = this.shift();

    while (this.match(TokenType.LESS, TokenType.LESS_EQUAL, TokenType.GREATER, TokenType.GREATER_EQUAL)) {
      const operator = this.previous().lexeme;
      const right = this.shift();
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right,
      };
    }

    return expr;
  }

  // Shift: <<, >>
  private shift(): Expression {
    let expr = this.term();

    while (this.match(TokenType.LESS_LESS, TokenType.GREATER_GREATER)) {
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

  // Additive: +, -
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

  // Multiplicative: *, /, %
  private factor(): Expression {
    let expr = this.exponentiation();

    while (this.match(TokenType.STAR, TokenType.SLASH, TokenType.PERCENT)) {
      const operator = this.previous().lexeme;
      const right = this.exponentiation();
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right,
      };
    }

    return expr;
  }

  // Exponentiation: ** (right associative)
  private exponentiation(): Expression {
    const expr = this.unary();

    if (this.match(TokenType.STAR_STAR)) {
      const right = this.exponentiation(); // Right associative
      return {
        type: 'BinaryExpression',
        operator: '**',
        left: expr,
        right,
      };
    }

    return expr;
  }

  // Unary: !, -, ~
  private unary(): Expression {
    // Prefix ++/--
    if (this.match(TokenType.PLUS_PLUS, TokenType.MINUS_MINUS)) {
      const operator = this.previous().lexeme as '++' | '--';
      const argument = this.unary();
      if (argument.type !== 'Identifier' && argument.type !== 'MemberExpression' && argument.type !== 'IndexExpression') {
        throw new Error('Invalid increment/decrement target');
      }
      return {
        type: 'UpdateExpression',
        operator,
        argument: argument as Identifier | MemberExpression | IndexExpression,
        prefix: true,
      };
    }

    if (this.match(TokenType.BANG, TokenType.MINUS, TokenType.TILDE)) {
      const operator = this.previous().lexeme;
      const argument = this.unary();
      return {
        type: 'UnaryExpression',
        operator,
        argument,
      };
    }

    return this.postfix();
  }

  // Handle postfix ++/--
  private postfix(): Expression {
    let expr = this.call();

    if (this.match(TokenType.PLUS_PLUS, TokenType.MINUS_MINUS)) {
      const operator = this.previous().lexeme as '++' | '--';
      if (expr.type !== 'Identifier' && expr.type !== 'MemberExpression' && expr.type !== 'IndexExpression') {
        throw new Error('Invalid increment/decrement target');
      }
      return {
        type: 'UpdateExpression',
        operator,
        argument: expr as Identifier | MemberExpression | IndexExpression,
        prefix: false,
      };
    }

    return expr;
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
      } else if (this.match(TokenType.LBRACKET)) {
        expr = this.finishIndexOrSlice(expr);
      } else {
        break;
      }
    }

    return expr;
  }

  private finishIndexOrSlice(object: Expression): Expression {
    // Check for slice notation: [start:end], [:end], [start:], [:]
    // vs regular index: [index]
    
    let start: Expression | null = null;
    let end: Expression | null = null;
    let isSlice = false;
    
    // Check for [:...] (start is null)
    if (this.check(TokenType.COLON)) {
      isSlice = true;
    } else if (!this.check(TokenType.RBRACKET)) {
      // Parse the first expression (could be start or index)
      start = this.expression();
    }
    
    // Check if this is a slice (has colon)
    if (this.match(TokenType.COLON)) {
      isSlice = true;
      // Check for [...:end] or [...:]
      if (!this.check(TokenType.RBRACKET)) {
        end = this.expression();
      }
    }
    
    this.consume(TokenType.RBRACKET, "Expected ']' after index/slice");
    
    if (isSlice) {
      return {
        type: 'SliceExpression',
        object,
        start,
        end,
      };
    } else {
      return {
        type: 'IndexExpression',
        object,
        index: start!,
      };
    }
  }

  private finishCall(callee: Expression): CallExpression {
    const args: { name: string | null; value: Expression }[] = [];
    let seenKeyword = false;

    if (!this.check(TokenType.RPAREN)) {
      do {
        // Check for keyword argument: identifier = expression
        // We need to look ahead to distinguish `x=5` from `x==5`
        if (this.check(TokenType.IDENTIFIER) && this.peekNext()?.type === TokenType.EQUAL) {
          const name = this.advance().lexeme;  // consume identifier
          this.advance();  // consume =
          const value = this.expression();
          args.push({ name, value });
          seenKeyword = true;
        } else {
          // Positional argument
          if (seenKeyword) {
            throw new Error(`Positional argument cannot follow keyword argument at line ${this.peek().line}`);
          }
          args.push({ name: null, value: this.expression() });
        }
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RPAREN, "Expected ')' after arguments");

    return {
      type: 'CallExpression',
      callee,
      arguments: args,
    };
  }

  private peekNext(): Token | null {
    if (this.current + 1 >= this.tokens.length) return null;
    return this.tokens[this.current + 1];
  }

  private primary(): Expression {
    if (this.match(TokenType.TRUE)) {
      return { type: 'BooleanLiteral', value: true };
    }

    if (this.match(TokenType.FALSE)) {
      return { type: 'BooleanLiteral', value: false };
    }

    if (this.match(TokenType.NULL)) {
      return { type: 'NullLiteral' };
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

    if (this.match(TokenType.LBRACKET)) {
      // Array literal
      const elements: Expression[] = [];
      if (!this.check(TokenType.RBRACKET)) {
        do {
          elements.push(this.expression());
        } while (this.match(TokenType.COMMA));
      }
      this.consume(TokenType.RBRACKET, "Expected ']' after array elements");
      return { type: 'ArrayLiteral', elements };
    }

    if (this.match(TokenType.LBRACE)) {
      // Object literal: {key: value, ...}
      return this.objectLiteral();
    }

    if (this.match(TokenType.MATCH)) {
      // Match expression
      return this.matchExpression();
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

  private objectLiteral(): ObjectLiteral {
    // We've already consumed the opening {
    const properties: ObjectProperty[] = [];
    
    if (!this.check(TokenType.RBRACE)) {
      do {
        const key = this.consume(TokenType.IDENTIFIER, "Expected property name");
        this.consume(TokenType.COLON, "Expected ':' after property name");
        const value = this.expression();
        properties.push({ key: key.lexeme, value });
      } while (this.match(TokenType.COMMA));
    }
    
    this.consume(TokenType.RBRACE, "Expected '}' after object properties");
    
    return { type: 'ObjectLiteral', properties };
  }

  private matchExpression(): MatchExpression {
    // 'match' has already been consumed
    const subject = this.expression();
    this.consume(TokenType.LBRACE, "Expected '{' after match subject");
    
    const arms: MatchArm[] = [];
    
    if (!this.check(TokenType.RBRACE)) {
      do {
        const pattern = this.pattern();
        this.consume(TokenType.FAT_ARROW, "Expected '=>' after pattern");
        const body = this.matchArmBody();
        arms.push({ pattern, body });
      } while (this.match(TokenType.COMMA));
    }
    
    this.consume(TokenType.RBRACE, "Expected '}' after match arms");
    
    return { type: 'MatchExpression', subject, arms };
  }

  /**
   * Parse the body of a match arm.
   * Could be either a block statement { ... } or a single expression.
   * 
   * To distinguish between object literal { key: value } and block { statement },
   * we use lookahead:
   * - If we see { followed by IDENTIFIER followed by COLON, it's likely an object literal
   * - Otherwise, if we see { followed by IDENTIFIER followed by EQUAL or other statement-starters, 
   *   it's a block statement
   */
  private matchArmBody(): Expression | BlockStatement {
    if (this.check(TokenType.LBRACE)) {
      // Look ahead to determine if this is a block or object literal
      // Save current position for potential backtracking
      const isBlock = this.isBlockNotObjectLiteral();
      
      if (isBlock) {
        // Parse as block statement
        this.advance(); // consume '{'
        return this.blockStatement();
      }
    }
    
    // Otherwise parse as expression (includes object literals)
    return this.expression();
  }

  /**
   * Lookahead to determine if { starts a block statement or object literal.
   * 
   * Block indicators (after LBRACE):
   * - Empty block: }
   * - Control flow: if, loop, match, return, break
   * - Assignment: IDENTIFIER = (not IDENTIFIER :)
   * - Function call: IDENTIFIER ( 
   * - Expression starting with non-identifier
   * 
   * Object literal indicators:
   * - IDENTIFIER COLON (the key: value pattern)
   */
  private isBlockNotObjectLiteral(): boolean {
    // We're looking at {, check what follows
    const next = this.peekNext();
    
    if (!next) return false;
    
    // Empty block: { }
    if (next.type === TokenType.RBRACE) {
      return true;
    }
    
    // Control flow keywords indicate a block
    if (next.type === TokenType.IF ||
        next.type === TokenType.LOOP ||
        next.type === TokenType.MATCH ||
        next.type === TokenType.RETURN ||
        next.type === TokenType.BREAK) {
      return true;
    }
    
    // If it's an identifier, check the token after that
    if (next.type === TokenType.IDENTIFIER) {
      const afterIdent = this.peekAt(2);
      if (!afterIdent) return false;
      
      // Object literal: identifier followed by colon
      if (afterIdent.type === TokenType.COLON) {
        return false; // It's an object literal
      }
      
      // Block statement indicators: =, +=, -=, etc., or function call (
      // If not a colon, assume it's a statement in a block
      return true;
    }
    
    // Non-identifier expressions like literals, arrays, etc. - 
    // these would be unusual in an object literal key position
    // but let the expression parser handle it
    return false;
  }

  /**
   * Peek at token at offset from current position.
   * offset 0 = current token, 1 = next token, etc.
   */
  private peekAt(offset: number): Token | null {
    const idx = this.current + offset;
    if (idx >= this.tokens.length) return null;
    return this.tokens[idx];
  }

  private pattern(): Pattern {
    // Wildcard pattern: _
    if (this.match(TokenType.UNDERSCORE)) {
      return { type: 'WildcardPattern' };
    }
    
    // Literal patterns: numbers, strings, booleans
    if (this.match(TokenType.NUMBER)) {
      return { type: 'LiteralPattern', value: this.previous().literal as number };
    }
    
    if (this.match(TokenType.STRING)) {
      return { type: 'LiteralPattern', value: this.previous().literal as string };
    }
    
    if (this.match(TokenType.TRUE)) {
      return { type: 'LiteralPattern', value: true };
    }
    
    if (this.match(TokenType.FALSE)) {
      return { type: 'LiteralPattern', value: false };
    }

    if (this.match(TokenType.NULL)) {
      return { type: 'LiteralPattern', value: null };
    }
    
    // Identifier or Variant pattern
    if (this.match(TokenType.IDENTIFIER)) {
      const name = this.previous().lexeme;
      
      // Check if it's a variant pattern: Name(binding1, binding2)
      if (this.match(TokenType.LPAREN)) {
        const bindings: string[] = [];
        if (!this.check(TokenType.RPAREN)) {
          do {
            const binding = this.consume(TokenType.IDENTIFIER, "Expected binding name");
            bindings.push(binding.lexeme);
          } while (this.match(TokenType.COMMA));
        }
        this.consume(TokenType.RPAREN, "Expected ')' after variant bindings");
        
        return {
          type: 'VariantPattern',
          enumName: null,  // Will be inferred from match subject type
          variantName: name,
          bindings,
        };
      }
      
      // Otherwise it's a simple identifier pattern (binds to the value)
      return { type: 'IdentifierPattern', name };
    }
    
    throw new Error(`Unexpected pattern at line ${this.peek().line}`);
  }
}
