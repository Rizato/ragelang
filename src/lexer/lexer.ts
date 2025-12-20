import { TokenType, Token, KEYWORDS } from "./tokens.js";

/**
 * Lexer for Ragelang
 * Tokenizes source code into a stream of tokens
 */
export class Lexer {
  private source: string;
  private tokens: Token[] = [];
  private start = 0;
  private current = 0;
  private line = 1;
  private column = 1;

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): Token[] {
    while (!this.isAtEnd()) {
      this.start = this.current;
      this.scanToken();
    }

    this.tokens.push({
      type: TokenType.EOF,
      lexeme: "",
      literal: null,
      line: this.line,
      column: this.column,
    });

    return this.tokens;
  }

  private scanToken(): void {
    const c = this.advance();

    switch (c) {
      case "(":
        this.addToken(TokenType.LPAREN);
        break;
      case ")":
        this.addToken(TokenType.RPAREN);
        break;
      case "{":
        this.addToken(TokenType.LBRACE);
        break;
      case "}":
        this.addToken(TokenType.RBRACE);
        break;
      case "[":
        this.addToken(TokenType.LBRACKET);
        break;
      case "]":
        this.addToken(TokenType.RBRACKET);
        break;
      case ",":
        this.addToken(TokenType.COMMA);
        break;
      case ".":
        this.addToken(TokenType.DOT);
        break;
      case ";":
        this.addToken(TokenType.SEMICOLON);
        break;
      case ":":
        this.addToken(TokenType.COLON);
        break;
      case "+":
        if (this.match("+")) {
          this.addToken(TokenType.PLUS_PLUS);
        } else if (this.match("=")) {
          this.addToken(TokenType.PLUS_EQUAL);
        } else {
          this.addToken(TokenType.PLUS);
        }
        break;
      case "-":
        if (this.match("-")) {
          this.addToken(TokenType.MINUS_MINUS);
        } else if (this.match("=")) {
          this.addToken(TokenType.MINUS_EQUAL);
        } else {
          this.addToken(TokenType.MINUS);
        }
        break;
      case "*":
        if (this.match("*")) {
          this.addToken(TokenType.STAR_STAR);
        } else if (this.match("=")) {
          this.addToken(TokenType.STAR_EQUAL);
        } else {
          this.addToken(TokenType.STAR);
        }
        break;
      case "/":
        if (this.match("/")) {
          this.lineComment();
        } else if (this.match("=")) {
          this.addToken(TokenType.SLASH_EQUAL);
        } else {
          this.addToken(TokenType.SLASH);
        }
        break;
      case "%":
        this.addToken(this.match("=") ? TokenType.PERCENT_EQUAL : TokenType.PERCENT);
        break;
      case "^":
        this.addToken(this.match("=") ? TokenType.CARET_EQUAL : TokenType.CARET);
        break;
      case "~":
        this.addToken(TokenType.TILDE);
        break;
      case "&":
        if (this.match("&")) {
          this.addToken(TokenType.AMPERSAND_AMPERSAND);
        } else if (this.match("=")) {
          this.addToken(TokenType.AMPERSAND_EQUAL);
        } else {
          this.addToken(TokenType.AMPERSAND);
        }
        break;
      case "|":
        if (this.match("|")) {
          this.addToken(TokenType.PIPE_PIPE);
        } else if (this.match("=")) {
          this.addToken(TokenType.PIPE_EQUAL);
        } else {
          this.addToken(TokenType.PIPE);
        }
        break;
      case "!":
        this.addToken(this.match("=") ? TokenType.BANG_EQUAL : TokenType.BANG);
        break;
      case "=":
        if (this.match("=")) {
          this.addToken(TokenType.EQUAL_EQUAL);
        } else if (this.match(">")) {
          this.addToken(TokenType.FAT_ARROW);
        } else {
          this.addToken(TokenType.EQUAL);
        }
        break;
      case "<":
        if (this.match("<")) {
          this.addToken(TokenType.LESS_LESS);
        } else if (this.match("=")) {
          this.addToken(TokenType.LESS_EQUAL);
        } else {
          this.addToken(TokenType.LESS);
        }
        break;
      case ">":
        if (this.match(">")) {
          this.addToken(TokenType.GREATER_GREATER);
        } else if (this.match("=")) {
          this.addToken(TokenType.GREATER_EQUAL);
        } else {
          this.addToken(TokenType.GREATER);
        }
        break;
      case "#":
        // Foundation marker - consume all consecutive # on this position
        this.foundation();
        break;

      case " ":
      case "\r":
      case "\t":
        // Ignore whitespace
        break;

      case "\n":
        this.addToken(TokenType.NEWLINE);
        this.line++;
        this.column = 1;
        break;

      case '"':
        this.string();
        break;

      default:
        if (this.isDigit(c)) {
          this.number();
        } else if (this.isAlpha(c)) {
          this.identifier();
        } else {
          // Unknown character - could be part of art/supports
          // We'll skip it for now
        }
        break;
    }
  }

  private lineComment(): void {
    const startColumn = this.column - 2; // Account for //
    while (this.peek() !== "\n" && !this.isAtEnd()) {
      this.advance();
    }
    // Include the comment token for support tracking
    this.tokens.push({
      type: TokenType.COMMENT,
      lexeme: this.source.substring(this.start, this.current),
      literal: null,
      line: this.line,
      column: startColumn,
    });
  }

  private foundation(): void {
    const startColumn = this.column - 1;
    // We already consumed one #, now just add the token
    this.tokens.push({
      type: TokenType.FOUNDATION,
      lexeme: "#",
      literal: null,
      line: this.line,
      column: startColumn,
    });
  }

  private string(): void {
    const startColumn = this.column - 1;
    while (this.peek() !== '"' && !this.isAtEnd()) {
      if (this.peek() === "\n") {
        this.line++;
        this.column = 1;
      }
      this.advance();
    }

    if (this.isAtEnd()) {
      throw new Error(`Unterminated string at line ${this.line}`);
    }

    // Consume closing "
    this.advance();

    // Trim the surrounding quotes
    const value = this.source.substring(this.start + 1, this.current - 1);
    this.tokens.push({
      type: TokenType.STRING,
      lexeme: this.source.substring(this.start, this.current),
      literal: value,
      line: this.line,
      column: startColumn,
    });
  }

  private number(): void {
    const startColumn = this.column - 1;
    const firstChar = this.source[this.start];

    // Check for hex literal (0x or 0X)
    if (firstChar === "0" && (this.peek() === "x" || this.peek() === "X")) {
      this.advance(); // consume 'x'
      while (this.isHexDigit(this.peek())) {
        this.advance();
      }
      const lexeme = this.source.substring(this.start, this.current);
      this.tokens.push({
        type: TokenType.NUMBER,
        lexeme,
        literal: parseInt(lexeme, 16),
        line: this.line,
        column: startColumn,
      });
      return;
    }

    // Check for binary literal (0b or 0B)
    if (firstChar === "0" && (this.peek() === "b" || this.peek() === "B")) {
      this.advance(); // consume 'b'
      while (this.peek() === "0" || this.peek() === "1") {
        this.advance();
      }
      const lexeme = this.source.substring(this.start, this.current);
      this.tokens.push({
        type: TokenType.NUMBER,
        lexeme,
        literal: parseInt(lexeme.slice(2), 2),
        line: this.line,
        column: startColumn,
      });
      return;
    }

    // Regular decimal number
    while (this.isDigit(this.peek())) {
      this.advance();
    }

    // Look for fractional part
    if (this.peek() === "." && this.isDigit(this.peekNext())) {
      this.advance(); // Consume the .
      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }

    // Look for exponent part (e or E)
    if (this.peek() === "e" || this.peek() === "E") {
      this.advance();
      if (this.peek() === "+" || this.peek() === "-") {
        this.advance();
      }
      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }

    const lexeme = this.source.substring(this.start, this.current);
    this.tokens.push({
      type: TokenType.NUMBER,
      lexeme,
      literal: parseFloat(lexeme),
      line: this.line,
      column: startColumn,
    });
  }

  private isHexDigit(c: string): boolean {
    return this.isDigit(c) || (c >= "a" && c <= "f") || (c >= "A" && c <= "F");
  }

  private identifier(): void {
    const startColumn = this.column - 1;
    while (this.isAlphaNumeric(this.peek())) {
      this.advance();
    }

    const text = this.source.substring(this.start, this.current);

    // Check for standalone underscore (wildcard pattern)
    if (text === "_") {
      this.tokens.push({
        type: TokenType.UNDERSCORE,
        lexeme: text,
        literal: null,
        line: this.line,
        column: startColumn,
      });
      return;
    }

    const type = KEYWORDS[text] ?? TokenType.IDENTIFIER;

    let literal: string | boolean | null = null;
    if (type === TokenType.TRUE) literal = true;
    else if (type === TokenType.FALSE) literal = false;

    this.tokens.push({
      type,
      lexeme: text,
      literal,
      line: this.line,
      column: startColumn,
    });
  }

  private advance(): string {
    const c = this.source[this.current];
    this.current++;
    this.column++;
    return c;
  }

  private match(expected: string): boolean {
    if (this.isAtEnd()) return false;
    if (this.source[this.current] !== expected) return false;

    this.current++;
    this.column++;
    return true;
  }

  private peek(): string {
    if (this.isAtEnd()) return "\0";
    return this.source[this.current];
  }

  private peekNext(): string {
    if (this.current + 1 >= this.source.length) return "\0";
    return this.source[this.current + 1];
  }

  private isAtEnd(): boolean {
    return this.current >= this.source.length;
  }

  private isDigit(c: string): boolean {
    return c >= "0" && c <= "9";
  }

  private isAlpha(c: string): boolean {
    return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_";
  }

  private isAlphaNumeric(c: string): boolean {
    return this.isAlpha(c) || this.isDigit(c);
  }

  private addToken(type: TokenType, literal: string | number | boolean | null = null): void {
    const text = this.source.substring(this.start, this.current);
    this.tokens.push({
      type,
      lexeme: text,
      literal,
      line: this.line,
      column: this.column - text.length,
    });
  }
}
