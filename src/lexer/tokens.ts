/**
 * Token types for the Ragelang lexer
 */
export enum TokenType {
  // Literals
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  IDENTIFIER = 'IDENTIFIER',
  
  // Keywords
  DRAW = 'DRAW',
  UPDATE = 'UPDATE',
  FUN = 'FUN',
  RETURN = 'RETURN',
  IF = 'IF',
  ELSE = 'ELSE',
  LOOP = 'LOOP',
  BREAK = 'BREAK',
  TRUE = 'TRUE',
  FALSE = 'FALSE',
  PROTOTYPE = 'PROTOTYPE',
  
  // Arithmetic Operators
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  STAR = 'STAR',
  STAR_STAR = 'STAR_STAR',       // **
  SLASH = 'SLASH',
  PERCENT = 'PERCENT',
  
  // Comparison
  EQUAL = 'EQUAL',
  EQUAL_EQUAL = 'EQUAL_EQUAL',
  BANG = 'BANG',
  BANG_EQUAL = 'BANG_EQUAL',
  LESS = 'LESS',
  LESS_EQUAL = 'LESS_EQUAL',
  GREATER = 'GREATER',
  GREATER_EQUAL = 'GREATER_EQUAL',
  
  // Logical
  AND = 'AND',                    // 'and' keyword
  OR = 'OR',                      // 'or' keyword
  AMPERSAND_AMPERSAND = 'AMPERSAND_AMPERSAND',  // &&
  PIPE_PIPE = 'PIPE_PIPE',        // ||
  
  // Bitwise
  AMPERSAND = 'AMPERSAND',        // &
  PIPE = 'PIPE',                  // |
  CARET = 'CARET',                // ^
  TILDE = 'TILDE',                // ~
  LESS_LESS = 'LESS_LESS',        // <<
  GREATER_GREATER = 'GREATER_GREATER',  // >>
  
  // Delimiters
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',
  COMMA = 'COMMA',
  DOT = 'DOT',
  SEMICOLON = 'SEMICOLON',
  COLON = 'COLON',
  
  // Special
  FOUNDATION = 'FOUNDATION',
  COMMENT = 'COMMENT',
  NEWLINE = 'NEWLINE',
  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  lexeme: string;
  literal: string | number | boolean | null;
  line: number;
  column: number;
}

export const KEYWORDS: Record<string, TokenType> = {
  'draw': TokenType.DRAW,
  'update': TokenType.UPDATE,
  'fun': TokenType.FUN,
  'return': TokenType.RETURN,
  'if': TokenType.IF,
  'else': TokenType.ELSE,
  'loop': TokenType.LOOP,
  'break': TokenType.BREAK,
  'true': TokenType.TRUE,
  'false': TokenType.FALSE,
  'prototype': TokenType.PROTOTYPE,
  'and': TokenType.AND,
  'or': TokenType.OR,
};
