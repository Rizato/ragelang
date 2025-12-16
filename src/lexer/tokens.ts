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
  IF = 'IF',
  ELSE = 'ELSE',
  TRUE = 'TRUE',
  FALSE = 'FALSE',
  PROTOTYPE = 'PROTOTYPE',
  
  // Operators
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  STAR = 'STAR',
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
  AND = 'AND',
  OR = 'OR',
  
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
  'if': TokenType.IF,
  'else': TokenType.ELSE,
  'true': TokenType.TRUE,
  'false': TokenType.FALSE,
  'prototype': TokenType.PROTOTYPE,
  'and': TokenType.AND,
  'or': TokenType.OR,
};

