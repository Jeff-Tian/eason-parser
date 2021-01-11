import * as util from "util"

export enum TokenType {
    LeftParen,
    RightParen,
    FunctionName,
    Space,
    ARG,
    EOF
}

export const getTokenType = (char: string, lastChar?: string) => {
    if (char === "(") {
        return TokenType.LeftParen
    }

    if (char === ')') {
        return TokenType.RightParen
    }

    if (char === ' ') {
        return TokenType.Space
    }

    if (char === undefined) {
        return TokenType.EOF
    }

    if (lastChar === "(") {
        return TokenType.FunctionName
    }

    return TokenType.ARG
}

export const readToEnd = (input: string, i: number, tokenType: TokenType) => {
    let token = ""
    while (getTokenType(input[i]) === tokenType) {
        token += input[i]
        i++
    }

    return token
}

const Functions = new Map<string, Function>([
    ['+', (...args: number[]) => args.map(arg => Number(arg)).reduce((prev, next) => prev + next, 0)]
])

const onlyALiteral = (tokens: Array<[string, TokenType]>) => tokens.length === 2

const extractLiteral = (tokens: Array<[string, TokenType]>) => Number(tokens[0][0])

export class SchemeParser {
    tokenize(input: string) {
        const res: Array<[string, TokenType]> = []

        let lastChar = undefined
        for (let i = 0; i < input.length; i++) {
            const char = input[i]
            const tokenType = getTokenType(char, lastChar)
            lastChar = char

            switch (tokenType) {
                case TokenType.LeftParen:
                    res.push([char, tokenType])
                    break
                case TokenType.EOF:
                    res.push([char, tokenType])
                    break
                case TokenType.RightParen:
                    res.push([char, tokenType])
                    break
                case TokenType.ARG:
                    const arg = readToEnd(input, i, TokenType.ARG)
                    res.push([arg, tokenType])
                    i += arg.length - 1
                    break
                case TokenType.Space:
                    res.push([char, tokenType])
                    break
                case TokenType.FunctionName:
                    res.push([char, tokenType])
                    break
                default:
                    throw new Error(`Unexpected token: ${char}`)
            }

        }

        res.push(["", TokenType.EOF])

        return res
    }

    parse(input: string) {
        const tokens = this.tokenize(input)

        if (onlyALiteral(tokens)) {
            return extractLiteral(tokens)
        }

        const fn = Functions.get(tokens[1][0])
        const args = tokens.filter(token => token[1] === TokenType.ARG).map(token => token[0])

        if (!fn) {
            throw new Error(`Function for ${tokens[1][0]} not found! Context: ${util.inspect(tokens)}, input: ${input}`)
        }

        return fn.apply(null, args)
    }
}
