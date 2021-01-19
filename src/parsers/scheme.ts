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

    if (char === ' ' || char === '\n') {
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

const add = (...args: number[]) => args.map(arg => Number(arg)).reduce((prev, next) => {
    return prev + next
}, 0)
const multiply = (...args: number[]) => args.map(arg => Number(arg)).reduce((prev, next) => {
    return prev * next
}, 1)

export const Functions = new Map<string, Function | number | undefined>([
    ['+', add],
    ['-', (...args: number[]) => add(...args.map((arg, index) => index === 0 ? arg : -arg))],
    ['*', multiply],
    ['=', (x: number, y: number) => x === y],
    ['else', (_x: number) => true],
    ['define', () => {
    }]
])

export const FunctionsForExplain = new Map<string, Function | number | undefined>([])

const onlyALiteral = (tokens: Array<[string, TokenType]>) => tokens.length === 2

export const extractLiteral = (tokens: Array<[string, TokenType]>) => {
    const res = Number(tokens[0][0]) || tokens[0][0]

    if (String(res) === "NaN") {
        console.error(`extracing NaN ! ${res}`)

        return tokens[0][0]
    }

    return res
}

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
        if (!input) return undefined

        const tokens = this.tokenize(input)

        if (onlyALiteral(tokens)) {
            return new SyntaxNode(1, SyntaxNodeType.Literal, extractLiteral(tokens))
        }

        const level = []
        let root = undefined
        let newNode = undefined
        let height = 0
        let functionExpected = false

        for (let i = 0; i < tokens.length; i++) {
            const currentToken = tokens[i]

            switch (currentToken[1]) {
                case TokenType.LeftParen && !functionExpected:
                    if (!functionExpected) {
                        newNode = new SyntaxNode(level.length, SyntaxNodeType.Expression)
                        level.push(newNode)
                        if (level.length > height) {
                            height = level.length
                        }
                        functionExpected = true
                    } else {
                        const node0: SyntaxNode = new SyntaxNode(level.length, SyntaxNodeType.Expression)
                        level.push(node0)
                        if (level.length > height) {
                            height = level.length
                        }
                    }
                    break
                case TokenType.FunctionName:
                    const node1 = new SyntaxNode(level.length, SyntaxNodeType.Operator, currentToken[0])
                    level[level.length - 1].addChildren(node1)
                    functionExpected = false
                    break
                case TokenType.ARG:
                    const node2 = new SyntaxNode(level.length, SyntaxNodeType.Literal, currentToken[0])
                    level[level.length - 1].addChildren(node2)
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
                    functionExpected = false
                    break
                default:
                    break
            }
        }

        if (!root) {
            throw new Error(`Unexpected Error for building syntax tree for ${input}, ${typeof input}`)
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

export const stringify = (n: any) => {
    if (n instanceof SyntaxNode) {
        if (n.children.length <= 0) {
            return n.value as string
        }

        return "(" + (n.children.map(c => {
            if (c.type === SyntaxNodeType.Literal) {
                let newVar = Functions.get(c.value as string) as unknown as SyntaxNode

                if (!newVar) {
                    return c.value
                }

                if (typeof newVar.value !== 'undefined' && typeof newVar.eval === 'function') {
                    return newVar.value ?? newVar.eval()
                }

                return JSON.stringify(c)
            }

            return c.value
        }).join(" ")) + ")"
    }

    return String(n)
}

// const repeat = (c: string, n: number) => new Array(n).fill(c).join("")

const explain = (node: SyntaxNode) => node.explain(1)
export const explains = (node: SyntaxNode) => {
    const res = []

    for (let i = 0; i < 10; i++) {
        let round = explain(node)
        if (String(round) === "NaN") {
            throw new Error(`explains error! ${node.children[2].toString()}`)
        }

        res.push(round)

        node = new SchemeParser().buildSyntaxTree(round)!
    }

    return res
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

    simplify(): any {
        if (this.type === SyntaxNodeType.Literal) {
            return {value: this.value, depth: this.depth}
        }

        if (this.type === SyntaxNodeType.Operator) {
            return {value: this.value, depth: this.depth}
        }

        return {depth: this.depth, children: this.children.map(c => c.simplify())}
    }

    toString() {
        return JSON.stringify(this.simplify(), undefined, "  ")
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
            return String(Functions.get(this.value as string) ?? this.value)
        }

        if (this.type === SyntaxNodeType.Operator) {
            return this.value as string
        }

        if (level <= this.depth + 1) {
            return stringify(this.eval())
        }

        return "(" + (this.children.map(c => {
            if (c.type === SyntaxNodeType.Literal) {
                return c.value
            }

            if (c.type === SyntaxNodeType.Operator) {
                return c.value
            }

            let res = c.explain(level)

            return res ?? "^"
        }).join(" ") || "-") + ")"
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

        const formalParameters = toBeDefined.children.slice(1)
        formalParameters.forEach(arg => {
            Functions.set(arg.value as string, undefined)
        })

        if (implementation.children[0].value === "cond") {
            const cond = (...actualParameters: number[]) => {
                formalParameters.forEach((arg, i) => {
                    Functions.set(arg.value as string, actualParameters[i])
                })

                const conditions = implementation.children.slice(1)

                for (let i = 0; i < conditions.length; i++) {
                    const cond = conditions[i].children[0].eval()

                    if (Boolean(cond)) {
                        return conditions[i].children[1].eval()
                    }
                }
                throw new Error(`cond expression error!`)
            }

            Functions.set(fn.value as string, cond)

            return undefined
        }

        Functions.set(fn.value as string, Functions.get(implementation.children[0].value as string)!)

        return undefined
    }

    defineExplain() {
        if (this.type !== SyntaxNodeType.Expression) {
            return undefined
        }

        if (this.children[0].value !== 'define') {
            return undefined
        }

        const toBeDefined = this.children[1]
        const implementation = this.children[2]

        if (toBeDefined.type === SyntaxNodeType.Literal && implementation.type === SyntaxNodeType.Literal) {
            FunctionsForExplain.set(toBeDefined.value as string, implementation.value as number)
            return undefined
        }

        const fn = toBeDefined.children[0]

        const formalParameters = toBeDefined.children.slice(1)
        formalParameters.forEach(arg => {
            FunctionsForExplain.set(arg.value as string, undefined)
        })

        if (implementation.children[0].value === "cond") {
            const cond = (...actualParameters: number[]) => {
                formalParameters.forEach((arg, i) => {
                    Functions.set(arg.value as string, actualParameters[i])
                    FunctionsForExplain.set(arg.value as string, actualParameters[i])
                })

                const conditions = implementation.children.slice(1)

                for (let i = 0; i < conditions.length; i++) {
                    const cond = conditions[i].children[0].eval()

                    if (Boolean(cond)) {
                        return conditions[i].children[1]
                    }
                }
                throw new Error(`cond expression error!`)
            }

            FunctionsForExplain.set(fn.value as string, cond)

            return undefined
        }

        FunctionsForExplain.set(fn.value as string, FunctionsForExplain.get(implementation.children[0].value as string)!)

        return undefined
    }

    expand(): any {
        const evals = (c: SyntaxNode) => {
            const res = c.eval()

            if (String(res) === "NaN") {
                console.error(`Evaluation error for ${c.toString()}`)

                return c.value
            }

            return res
        }

        if (this.children.slice(1).every(c => c.type === SyntaxNodeType.Literal)) {
            const fn = FunctionsForExplain.get(this.children[0].value as string) as Function
            if (fn) {
                return fn.apply(null, this.children.slice(1).map(evals)).flatten()
            } else {
                const fn2 = Functions.get(this.children[0].value as string) as Function
                return fn2.apply(null, this.children.slice(1).map(evals))
            }
        }


        const res = this
        res.children.slice(1).forEach((c, i) => {
            if (c.type === SyntaxNodeType.Literal) {
                return
            }

            if (!FunctionsForExplain.get(c.children[0].value as string)) {
                res.children[i + 1] = new SyntaxNode(1, SyntaxNodeType.Literal, c.eval() as number)
            } else {
                res.children[i + 1] = new SchemeParser().buildSyntaxTree(c.expand())!
            }
        })

        return res.flatten()
    }

    flatten(): string {
        if (this.type === SyntaxNodeType.Literal) {
            return String(FunctionsForExplain.get(this.value as string) ?? this.value)
        }

        if (this.type === SyntaxNodeType.Operator) {
            return String(this.value)
        }

        return ["(", this.children.map(c => c.flatten()).join(" "), ")"].join("")
    }

    expandToEnd() {
        const res = []
        let current: SyntaxNode = this

        let count = 1
        while (current && current.type === SyntaxNodeType.Expression && count < 100) {
            const expanded = current.expand()
            console.log("expanded = ", expanded)

            if (String(expanded) === "NaN") {
                return res
            }

            res.push(expanded)

            current = new SchemeParser().buildSyntaxTree(String(expanded))!
            count++
        }

        return res
    }
}
