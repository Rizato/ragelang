import { describe, it, expect } from 'vitest';
import { Lexer } from './lexer.js';
import { TokenType } from './tokens.js';

describe('Lexer', () => {
  it('should tokenize simple identifiers', () => {
    const lexer = new Lexer('hello world');
    const tokens = lexer.tokenize();

    expect(tokens).toHaveLength(3); // hello, world, EOF
    expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[0].lexeme).toBe('hello');
    expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[1].lexeme).toBe('world');
    expect(tokens[2].type).toBe(TokenType.EOF);
  });

  it('should tokenize numbers', () => {
    const lexer = new Lexer('42 3.14');
    const tokens = lexer.tokenize();

    expect(tokens).toHaveLength(3);
    expect(tokens[0].type).toBe(TokenType.NUMBER);
    expect(tokens[0].literal).toBe(42);
    expect(tokens[1].type).toBe(TokenType.NUMBER);
    expect(tokens[1].literal).toBe(3.14);
  });

  it('should tokenize strings', () => {
    const lexer = new Lexer('"Hello, World!"');
    const tokens = lexer.tokenize();

    expect(tokens).toHaveLength(2);
    expect(tokens[0].type).toBe(TokenType.STRING);
    expect(tokens[0].literal).toBe('Hello, World!');
  });

  it('should tokenize keywords', () => {
    const lexer = new Lexer('draw update if else true false prototype');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.DRAW);
    expect(tokens[1].type).toBe(TokenType.UPDATE);
    expect(tokens[2].type).toBe(TokenType.IF);
    expect(tokens[3].type).toBe(TokenType.ELSE);
    expect(tokens[4].type).toBe(TokenType.TRUE);
    expect(tokens[5].type).toBe(TokenType.FALSE);
    expect(tokens[6].type).toBe(TokenType.PROTOTYPE);
  });

  it('should tokenize operators', () => {
    const lexer = new Lexer('+ - * / % = == != < <= > >=');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.PLUS);
    expect(tokens[1].type).toBe(TokenType.MINUS);
    expect(tokens[2].type).toBe(TokenType.STAR);
    expect(tokens[3].type).toBe(TokenType.SLASH);
    expect(tokens[4].type).toBe(TokenType.PERCENT);
    expect(tokens[5].type).toBe(TokenType.EQUAL);
    expect(tokens[6].type).toBe(TokenType.EQUAL_EQUAL);
    expect(tokens[7].type).toBe(TokenType.BANG_EQUAL);
    expect(tokens[8].type).toBe(TokenType.LESS);
    expect(tokens[9].type).toBe(TokenType.LESS_EQUAL);
    expect(tokens[10].type).toBe(TokenType.GREATER);
    expect(tokens[11].type).toBe(TokenType.GREATER_EQUAL);
  });

  it('should tokenize delimiters', () => {
    const lexer = new Lexer('( ) { } [ ] , . ;');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.LPAREN);
    expect(tokens[1].type).toBe(TokenType.RPAREN);
    expect(tokens[2].type).toBe(TokenType.LBRACE);
    expect(tokens[3].type).toBe(TokenType.RBRACE);
    expect(tokens[4].type).toBe(TokenType.LBRACKET);
    expect(tokens[5].type).toBe(TokenType.RBRACKET);
    expect(tokens[6].type).toBe(TokenType.COMMA);
    expect(tokens[7].type).toBe(TokenType.DOT);
    expect(tokens[8].type).toBe(TokenType.SEMICOLON);
  });

  it('should tokenize comments', () => {
    const lexer = new Lexer('foo // this is a comment\nbar');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[0].lexeme).toBe('foo');
    expect(tokens[1].type).toBe(TokenType.COMMENT);
    expect(tokens[2].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[2].lexeme).toBe('bar');
  });

  it('should tokenize foundation markers', () => {
    const lexer = new Lexer('###');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.FOUNDATION);
    expect(tokens[1].type).toBe(TokenType.FOUNDATION);
    expect(tokens[2].type).toBe(TokenType.FOUNDATION);
  });

  it('should tokenize a complete program', () => {
    const source = `
player = prototype()
player.x = 100
player.y = 200

draw {
  clear("#000000")
  text("Score: 0", 10, 10, "#ffffff")
}

update(dt) {
  player.x = player.x + 1
}
`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    // Just verify it doesn't throw and produces tokens
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens[tokens.length - 1].type).toBe(TokenType.EOF);
  });

  it('should track line and column numbers', () => {
    const lexer = new Lexer('foo\nbar');
    const tokens = lexer.tokenize();

    expect(tokens[0].line).toBe(1);
    expect(tokens[1].line).toBe(2);
  });

  it('should handle empty input', () => {
    const lexer = new Lexer('');
    const tokens = lexer.tokenize();

    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe(TokenType.EOF);
  });

  it('should handle logical operators', () => {
    const lexer = new Lexer('and or');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.AND);
    expect(tokens[1].type).toBe(TokenType.OR);
  });
});

