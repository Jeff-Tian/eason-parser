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

const add = (...args: number[]) => args.map(arg => Number(arg)).reduce((prev, next) => prev + next, 0)

const Functions = new Map<string, Function>([
    ['+', add],
    ['-', (...args: number[]) => add(...args.map((arg, index) => index === 0 ? arg : -arg))]
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

    buildSyntaxTree(input: string) {
        const tokens = this.tokenize(input)

        if (onlyALiteral(tokens)) {
            return new SyntaxNode(SyntaxNodeType.Literal, extractLiteral(tokens))
        }

        const level = []
        let root = undefined
        let newNode = undefined

        for (let i = 0; i < tokens.length; i++) {
            const currentToken = tokens[i]

            switch (currentToken[1]) {
                case TokenType.LeftParen:
                    newNode = new SyntaxNode(SyntaxNodeType.Expression)
                    level.push(newNode)
                    break
                case TokenType.FunctionName:
                    const node1 = new SyntaxNode(SyntaxNodeType.Operator, currentToken[0])
                    newNode!.addChildren(node1)
                    break
                case TokenType.ARG:
                    const node2 = new SyntaxNode(SyntaxNodeType.Literal, currentToken[0])
                    newNode!.addChildren(node2)
                    break
                case TokenType.Space:
                    break
                case TokenType.RightParen:
                    const current = level.pop()
                    if (level.length > 0) {
                        level[level.length - 1].addChildren(current!)
                    } else {
                        root = current
                    }
                    break
                default:
                    break
            }
        }

        return root
    }

    parse(input: string) {
        const st = this.buildSyntaxTree(input)
        return st!.eval()
    }
}

export enum SyntaxNodeType {
    Literal,
    Operator,
    Expression
}

export class SyntaxNode {
    type: SyntaxNodeType
    children: SyntaxNode[] = []
    value: number | string | undefined

    constructor(type: SyntaxNodeType, value?: number | string) {
        this.type = type
        this.value = value
    }

    addChildren(node: SyntaxNode) {
        this.children.push(node)
    }

    toString() {
        return util.inspect(this)
    }

    eval(): number | Function | undefined {
        if (this.type === SyntaxNodeType.Literal) {
            return Number(this.value)
        }

        if (this.type === SyntaxNodeType.Operator) {
            return Functions.get(this.value as string)
        }

        return (this.children[0].eval()! as Function).apply(null, this.children.slice(1).map(c => c.eval()))
    }
}
