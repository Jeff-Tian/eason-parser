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

export const readToEnd = (input: string, i: number, tokenType: TokenType, lastChar?: string) => {
    let token = ""
    while (getTokenType(input[i], lastChar) === tokenType) {
        token += input[i]
        i++
    }

    return token
}

const add = (...args: number[]) => args.map(arg => Number(arg)).reduce((prev, next) => prev + next, 0)

export const Functions = new Map<string, Function | number>([
    ['+', add],
    ['-', (...args: number[]) => add(...args.map((arg, index) => index === 0 ? arg : -arg))],
    ['=', (x: number, y: number) => x === y],
    // ['cond', (...args: SyntaxNode[]) => {
    //     console.log("cond for ", args)
    //     for (let i = 0; i < args.length; i++) {
    //         const arg = args[i]
    //
    //         if (!arg.children) {
    //             throw new Error(`Unexpected arg: ${util.inspect(arg)} in ${i}`)
    //         }
    //
    //         if (arg.children[0].eval()) {
    //             return arg.children[1].eval()
    //         }
    //     }
    //
    //     throw new Error("Not all paths return a value for `cond`")
    // }],
    ['else', (_x: number) => true],
    ['define', () => {
    }]
])

const onlyALiteral = (tokens: Array<[string, TokenType]>) => tokens.length === 2

export const extractLiteral = (tokens: Array<[string, TokenType]>) => Number(tokens[0][0]) || tokens[0][0]

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
                    const fn = readToEnd(input, i, TokenType.FunctionName, "(")
                    res.push([fn, tokenType])
                    i += fn.length - 1
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
            return new SyntaxNode(1, SyntaxNodeType.Literal, extractLiteral(tokens))
        }

        const level = []
        let root = undefined
        let newNode = undefined
        let height = 0

        for (let i = 0; i < tokens.length; i++) {
            const currentToken = tokens[i]

            switch (currentToken[1]) {
                case TokenType.LeftParen:
                    newNode = new SyntaxNode(level.length, SyntaxNodeType.Expression)
                    level.push(newNode)
                    if (level.length > height) {
                        height = level.length
                    }
                    break
                case TokenType.FunctionName:
                    const node1 = new SyntaxNode(level.length, SyntaxNodeType.Operator, currentToken[0])
                    newNode!.addChildren(node1)
                    break
                case TokenType.ARG:
                    const node2 = new SyntaxNode(level.length, SyntaxNodeType.Literal, currentToken[0])
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

        root!.height = height
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
    depth: number

    height: number

    constructor(depth: number, type: SyntaxNodeType, value?: number | string) {
        this.type = type
        this.value = value
        this.depth = depth
        this.height = 1
    }

    addChildren(node: SyntaxNode) {
        this.children.push(node)
    }

    toString() {
        return util.inspect(this)
    }

    eval(): number | Function | undefined {
        if (this.type === SyntaxNodeType.Literal) {
            return Number(Functions.get(this.value as string) ?? this.value)
        }

        if (this.type === SyntaxNodeType.Operator) {
            return Functions.get(this.value as string)
        }

        if (!this.children[0].eval()) {
            throw new Error(`Function not found! ${this.children[0].value}, ${SyntaxNodeType[this.type]}`)
        }

        return (this.children[0].eval()! as Function).apply(null, this.children.slice(1).map(c => c.eval()))
    }

    explain(level: number): string {
        if (this.type === SyntaxNodeType.Literal) {
            return String(this.value)
        }

        if (this.type === SyntaxNodeType.Operator) {
            return this.value as string
        }

        if (level === this.depth + 1) {
            return String(this.eval())
        }

        return "(" + this.children.map(c => c.explain(level)).join(" ") + ")"
    }

    explainStepByStep(): string[] {
        const res = [this.explain(Infinity)]
        for (let i = this.height; i >= 1; i--) {
            res.push(this.explain(i))
        }
        return res
    }

    define() {
        if (this.type !== SyntaxNodeType.Expression) {
            return undefined
        }

        if (this.children[0].value !== 'define') {
            return undefined
        }

        const toBeDefined = this.children[1]
        const implementation = this.children[2]

        if (toBeDefined.type === SyntaxNodeType.Literal && implementation.type === SyntaxNodeType.Literal) {
            Functions.set(toBeDefined.value as string, implementation.value as number)
            return undefined
        }

        const fn = toBeDefined.children[0]

        if (implementation.children[0].value === "cond") {
            Functions.set(fn.value as string, () => 1)

            return undefined
        }

        Functions.set(fn.value as string, Functions.get(implementation.children[0].value as string)!)

        return undefined
    }
}
