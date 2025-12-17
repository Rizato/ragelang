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

  it('should tokenize compound assignment operators', () => {
    const lexer = new Lexer('+= -= *= /= %= &= |= ^=');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.PLUS_EQUAL);
    expect(tokens[1].type).toBe(TokenType.MINUS_EQUAL);
    expect(tokens[2].type).toBe(TokenType.STAR_EQUAL);
    expect(tokens[3].type).toBe(TokenType.SLASH_EQUAL);
    expect(tokens[4].type).toBe(TokenType.PERCENT_EQUAL);
    expect(tokens[5].type).toBe(TokenType.AMPERSAND_EQUAL);
    expect(tokens[6].type).toBe(TokenType.PIPE_EQUAL);
    expect(tokens[7].type).toBe(TokenType.CARET_EQUAL);
  });

  it('should tokenize increment and decrement operators', () => {
    const lexer = new Lexer('++ --');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.PLUS_PLUS);
    expect(tokens[1].type).toBe(TokenType.MINUS_MINUS);
  });

  it('should distinguish between + and ++ and +=', () => {
    const lexer = new Lexer('+ ++ +=');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.PLUS);
    expect(tokens[1].type).toBe(TokenType.PLUS_PLUS);
    expect(tokens[2].type).toBe(TokenType.PLUS_EQUAL);
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
    expect(tokens[2].type).toBe(TokenType.NEWLINE);
    expect(tokens[3].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[3].lexeme).toBe('bar');
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

    expect(tokens[0].line).toBe(1);  // foo
    expect(tokens[1].type).toBe(TokenType.NEWLINE);
    expect(tokens[2].line).toBe(2);  // bar
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

  // ============ NEW TOKEN TESTS ============

  it('should tokenize power operator', () => {
    const lexer = new Lexer('2 ** 3');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.NUMBER);
    expect(tokens[1].type).toBe(TokenType.STAR_STAR);
    expect(tokens[2].type).toBe(TokenType.NUMBER);
  });

  it('should tokenize C-style logical operators', () => {
    const lexer = new Lexer('x && y || z');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[1].type).toBe(TokenType.AMPERSAND_AMPERSAND);
    expect(tokens[2].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[3].type).toBe(TokenType.PIPE_PIPE);
    expect(tokens[4].type).toBe(TokenType.IDENTIFIER);
  });

  it('should tokenize bitwise operators', () => {
    const lexer = new Lexer('a & b | c ^ d ~ e');
    const tokens = lexer.tokenize();

    expect(tokens[1].type).toBe(TokenType.AMPERSAND);
    expect(tokens[3].type).toBe(TokenType.PIPE);
    expect(tokens[5].type).toBe(TokenType.CARET);
    expect(tokens[7].type).toBe(TokenType.TILDE);
  });

  it('should tokenize shift operators', () => {
    const lexer = new Lexer('x << 2 >> 1');
    const tokens = lexer.tokenize();

    expect(tokens[1].type).toBe(TokenType.LESS_LESS);
    expect(tokens[3].type).toBe(TokenType.GREATER_GREATER);
  });

  it('should tokenize fat arrow', () => {
    const lexer = new Lexer('=> x');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.FAT_ARROW);
    expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
  });

  it('should tokenize colon', () => {
    const lexer = new Lexer('a : b');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[1].type).toBe(TokenType.COLON);
    expect(tokens[2].type).toBe(TokenType.IDENTIFIER);
  });

  it('should tokenize underscore as wildcard', () => {
    const lexer = new Lexer('match _ => x');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.MATCH);
    expect(tokens[1].type).toBe(TokenType.UNDERSCORE);
    expect(tokens[2].type).toBe(TokenType.FAT_ARROW);
  });

  it('should tokenize enum keyword', () => {
    const lexer = new Lexer('enum State { Idle Active }');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.ENUM);
    expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[2].type).toBe(TokenType.LBRACE);
    expect(tokens[3].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[4].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[5].type).toBe(TokenType.RBRACE);
  });

  it('should tokenize match keyword', () => {
    const lexer = new Lexer('match state { Idle => x }');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.MATCH);
    expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[2].type).toBe(TokenType.LBRACE);
    expect(tokens[3].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[4].type).toBe(TokenType.FAT_ARROW);
  });

  it('should tokenize fun keyword', () => {
    const lexer = new Lexer('fun add(a, b) { return a + b }');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.FUN);
    expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[2].type).toBe(TokenType.LPAREN);
  });

  it('should tokenize loop keyword', () => {
    const lexer = new Lexer('loop { break }');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.LOOP);
    expect(tokens[1].type).toBe(TokenType.LBRACE);
    expect(tokens[2].type).toBe(TokenType.BREAK);
    expect(tokens[3].type).toBe(TokenType.RBRACE);
  });

  it('should tokenize return keyword', () => {
    const lexer = new Lexer('return 42');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.RETURN);
    expect(tokens[1].type).toBe(TokenType.NUMBER);
  });

  it('should tokenize hexadecimal numbers', () => {
    const lexer = new Lexer('0xFF 0x10 0xABCD');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.NUMBER);
    expect(tokens[0].literal).toBe(255);
    expect(tokens[1].type).toBe(TokenType.NUMBER);
    expect(tokens[1].literal).toBe(16);
    expect(tokens[2].type).toBe(TokenType.NUMBER);
    expect(tokens[2].literal).toBe(0xABCD);
  });

  it('should tokenize binary numbers', () => {
    const lexer = new Lexer('0b1010 0b11111111');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.NUMBER);
    expect(tokens[0].literal).toBe(10);
    expect(tokens[1].type).toBe(TokenType.NUMBER);
    expect(tokens[1].literal).toBe(255);
  });

  it('should tokenize scientific notation', () => {
    const lexer = new Lexer('1e10 2.5e-3');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.NUMBER);
    expect(tokens[0].literal).toBe(1e10);
    expect(tokens[1].type).toBe(TokenType.NUMBER);
    expect(tokens[1].literal).toBe(2.5e-3);
  });

  it('should tokenize array brackets', () => {
    const lexer = new Lexer('[1, 2, 3]');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.LBRACKET);
    expect(tokens[1].type).toBe(TokenType.NUMBER);
    expect(tokens[2].type).toBe(TokenType.COMMA);
    expect(tokens[6].type).toBe(TokenType.RBRACKET);
  });

  it('should tokenize object literal syntax', () => {
    const lexer = new Lexer('{x: 1, y: 2}');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.LBRACE);
    expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[2].type).toBe(TokenType.COLON);
    expect(tokens[3].type).toBe(TokenType.NUMBER);
    expect(tokens[4].type).toBe(TokenType.COMMA);
  });

  it('should tokenize slice syntax', () => {
    const lexer = new Lexer('arr[1:3]');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[1].type).toBe(TokenType.LBRACKET);
    expect(tokens[2].type).toBe(TokenType.NUMBER);
    expect(tokens[3].type).toBe(TokenType.COLON);
    expect(tokens[4].type).toBe(TokenType.NUMBER);
    expect(tokens[5].type).toBe(TokenType.RBRACKET);
  });

  it('should tokenize complete enum declaration', () => {
    const lexer = new Lexer(`
enum GameState {
  Menu,
  Playing(level),
  Paused,
  GameOver(score)
}
`);
    const tokens = lexer.tokenize();
    
    // Find enum keyword
    const enumIdx = tokens.findIndex(t => t.type === TokenType.ENUM);
    expect(enumIdx).toBeGreaterThanOrEqual(0);
    
    // Check structure
    expect(tokens[enumIdx + 1].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[enumIdx + 1].lexeme).toBe('GameState');
  });

  it('should tokenize match expression', () => {
    const lexer = new Lexer(`
match state {
  Idle => handle_idle(),
  Walking(speed) => handle_walk(speed),
  _ => default_handler()
}
`);
    const tokens = lexer.tokenize();
    
    const matchIdx = tokens.findIndex(t => t.type === TokenType.MATCH);
    expect(matchIdx).toBeGreaterThanOrEqual(0);
    
    // Check for fat arrows
    const arrows = tokens.filter(t => t.type === TokenType.FAT_ARROW);
    expect(arrows.length).toBe(3);
    
    // Check for underscore wildcard
    const underscores = tokens.filter(t => t.type === TokenType.UNDERSCORE);
    expect(underscores.length).toBe(1);
  });

  it('should not confuse # in strings with foundation markers', () => {
    const lexer = new Lexer('color = "#ff0000"');
    const tokens = lexer.tokenize();

    // Should have: color, =, "#ff0000", EOF
    expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[1].type).toBe(TokenType.EQUAL);
    expect(tokens[2].type).toBe(TokenType.STRING);
    expect(tokens[2].literal).toBe('#ff0000');
    // No FOUNDATION tokens
    const foundations = tokens.filter(t => t.type === TokenType.FOUNDATION);
    expect(foundations.length).toBe(0);
  });
});

