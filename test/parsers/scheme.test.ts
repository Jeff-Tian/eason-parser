import {
    extractLiteral,
    Functions,
    getTokenType,
    readToEnd,
    SchemeParser,
    SyntaxNode,
    SyntaxNodeType,
    TokenType
} from "../../src/parsers/scheme"

describe("scheme parser", () => {
    describe("tokenize", () => {
        describe("getTokenType", () => {

            it('(', () => {
                expect(getTokenType("(")).toEqual(TokenType.LeftParen)
            })

            it(")", () => {
                expect(getTokenType(")")).toEqual(TokenType.RightParen)
            })

            it(" ", () => {
                expect(getTokenType(" ")).toEqual(TokenType.Space)
            })

            it("A", () => {
                expect(getTokenType("A", "(")).toEqual(TokenType.FunctionName)
            })

            it("1", () => {
                expect(getTokenType("1", " ")).toEqual(TokenType.ARG)
            })
        })

        describe("readToEnd", () => {
            it('reads to end', () => {
                const input = "1234"
                const token = readToEnd(input, 0, TokenType.ARG)
                expect(token).toEqual(input)
            })

            it("stops at space", () => {
                const input = "1 34"
                const token = readToEnd(input, 0, TokenType.ARG)
                expect(token).toEqual("1")
            })

            it("stops at )", () => {
                const input = "(A 1 10)"
                const token = readToEnd(input, 5, TokenType.ARG)
                expect(token).toEqual("10")
            })
        })

        describe("tokenize", () => {
            it("tokenize expression", () => {
                const schemeParser = new SchemeParser()

                const res = schemeParser.tokenize("(A 1 10)")
                expect(res).toStrictEqual([
                    ["(", TokenType.LeftParen],
                    ["A", TokenType.FunctionName],
                    [" ", TokenType.Space],
                    ["1", TokenType.ARG],
                    [" ", TokenType.Space],
                    ["10", TokenType.ARG],
                    [")", TokenType.RightParen],
                    ["", TokenType.EOF]
                ])
            })

            it("adds", () => {
                const p = new SchemeParser()

                const res = p.tokenize("(+ 1 1)")
                expect(res).toStrictEqual([
                    ["(", TokenType.LeftParen],
                    ["+", TokenType.FunctionName],
                    [" ", TokenType.Space],
                    ["1", TokenType.ARG],
                    [" ", TokenType.Space],
                    ["1", TokenType.ARG],
                    [")", TokenType.RightParen],
                    ["", TokenType.EOF]
                ])
            })

            it("tokenize literal", () => {
                const p = new SchemeParser()

                const res = p.tokenize("x")
                expect(res).toStrictEqual([
                    ["x", TokenType.ARG],
                    ["", TokenType.EOF]
                ])

                expect(extractLiteral(res)).toEqual("x")
            })

            it("tokenize expression contains 2 children ((= a 0) b)", () => {
                const p = new SchemeParser()
                const res = p.tokenize("((= a 0) b)")
                expect(res).toStrictEqual([
                    ["(", TokenType.LeftParen],
                    ["(", TokenType.LeftParen],
                    ["=", TokenType.FunctionName],
                    [" ", TokenType.Space],
                    ["a", TokenType.ARG],
                    [" ", TokenType.Space],
                    ["0", TokenType.ARG],
                    [")", TokenType.RightParen],
                    [" ", TokenType.Space],
                    ["b", TokenType.ARG],
                    [")", TokenType.RightParen],
                    ["", TokenType.EOF]
                ])
            })
        })

        describe("parses", () => {
            it("parses 1", () => {
                const p = new SchemeParser()
                const res = p.parse("1")
                expect(res).toEqual(1)
            })

            it("parses (+ 1 1)", () => {
                const p = new SchemeParser()
                const res = p.parse("(+ 1 1)")
                expect(res).toEqual(2)
            })

            it("parses (- 1 1)", () => {
                const p = new SchemeParser()
                const res = p.parse("(- 1 1)")
                expect(res).toEqual(0)
            })

            it("parses (+ 1 (- 1 1))", () => {
                const p = new SchemeParser()
                const res = p.parse("(+ 1 (- 1 1))")
                expect(res).toEqual(1)
            })
        })

        describe("syntax tree", () => {
            it("builds syntax tree for single literal", () => {
                const p = new SchemeParser()
                const res = p.buildSyntaxTree("1")
                expect(res).toBeDefined()
                expect(res!.type).toEqual(SyntaxNodeType.Literal)
                expect(res!.value).toEqual(1)
            })

            it("builds tree for (+ 1 1)", () => {
                const p = new SchemeParser()
                const res = p.buildSyntaxTree("(+ 1 1)")
                expect(res!.type).toEqual(SyntaxNodeType.Expression)
                expect(res!.children.length).toEqual(3)
            })

            it("builds tree for (+ 1 (- 1 1))", () => {
                const p = new SchemeParser()
                const res = p.buildSyntaxTree("(+ 1 (- 1 1))")
                expect(res).toBeDefined()
                expect(res!.type).toEqual(SyntaxNodeType.Expression)
                expect(res!.children.length).toEqual(3)

                expect(res!.children[2].type).toEqual(SyntaxNodeType.Expression)
                expect(res!.children[2].children.length).toEqual(3)
            })

            it("builds tree for 2 children expression ((= a 0) b)", () => {
                const p = new SchemeParser()
                const res = p.buildSyntaxTree("((= a 0) b)")
                expect(res).toBeDefined()
                expect(res!.type).toEqual(SyntaxNodeType.Expression)
                expect(res!.children.length).toEqual(2)
                expect(res!.children[0].children).toHaveLength(3)
                expect(res!.children[1].children).toHaveLength(0)
            })
        })

        describe("eval", () => {
            it("evals 1", () => {
                const n = new SyntaxNode(1, SyntaxNodeType.Literal, 1)
                expect(n.eval()).toEqual(1)
            })

            it('evals (+ 1 1)', () => {
                const n = new SchemeParser().buildSyntaxTree("(+ 1 1)")
                expect(n!.eval()).toEqual(2)
            })

            it("evals (+ 1 (- 1 1))", () => {
                const n = new SchemeParser().buildSyntaxTree("(+ 1 (- 1 1))")
                expect(n!.eval()).toEqual(1)
            })
        })

        describe("height", () => {
            it("1", () => {
                const n = new SchemeParser().buildSyntaxTree("1")
                expect(n!.height).toEqual(1)
            })

            it("1 for expression", () => {
                const n = new SchemeParser().buildSyntaxTree("(+ 1 1)")
                expect(n!.height).toEqual(1)
            })

            it("2 for expression", () => {
                const n = new SchemeParser().buildSyntaxTree("(+ 1 (- 1 1))")
                expect(n!.height).toEqual(2)
            })

            it("2 for expressions", () => {
                const n = new SchemeParser().buildSyntaxTree("(+ (- 1 1) (- 1 1))")
                expect(n!.height).toEqual(2)
            })

            it("height of (* 2 (C (- 1 1) (C 1 (- 7 1)))) is 4", () => {
                const n = new SchemeParser().buildSyntaxTree("(* 2 (C (- 1 1) (C 1 (- 7 1))))")
                expect(n!.height).toEqual(4)
            })

        })

        describe("explain", () => {
            it("explains level 1", () => {
                const n = new SchemeParser().buildSyntaxTree("(+ 1 1)")
                expect(n!.height).toEqual(1)
                expect(n!.depth).toEqual(0)
                expect(n!.explain(1)).toEqual("2")
            })

            it("explains level 2", () => {
                const n = new SchemeParser().buildSyntaxTree("(+ 1 (- 1 1))")
                expect(n!.explain(2)).toEqual("(+ 1 0)")
            })

            it("explains", () => {
                const n = new SchemeParser().buildSyntaxTree("(+ 1 (- 1 1))")
                expect(n!.explainStepByStep().join("\n")).toEqual(`(+ 1 (- 1 1))
(+ 1 0)
1`)
            })

            it("explains *", () => {
                const n = new SchemeParser().buildSyntaxTree("(* 2 2)")
                expect(n!.explain(1)).toEqual("4")
            })

            it("explains (* 2 k)", () => {
                const d = new SchemeParser().buildSyntaxTree("(define k 2)")
                d!.define()
                d!.defineExplain()
                const n = new SchemeParser().buildSyntaxTree("(* 2 k)")
                expect(n!.explain(1)).toEqual("4")
            })
        })

        describe("define", () => {
            it("reads function to end", () => {
                const res = readToEnd("(define (A x y) (+ x y))", 1, TokenType.FunctionName, "(")
                expect(res).toBe("define")
            })

            it("defines A as +", () => {
                const n = new SchemeParser().tokenize("(define (A x y) (+ x y))")
                expect(n).toStrictEqual([
                    ["(", TokenType.LeftParen],
                    ["define", TokenType.FunctionName],
                    [" ", TokenType.Space],
                    ["(", TokenType.LeftParen],
                    ["A", TokenType.FunctionName],
                    [" ", TokenType.Space],
                    ["x", TokenType.ARG],
                    [" ", TokenType.Space],
                    ["y", TokenType.ARG],
                    [")", TokenType.RightParen],
                    [" ", TokenType.Space],
                    ["(", TokenType.LeftParen],
                    ["+", TokenType.FunctionName],
                    [" ", TokenType.Space],
                    ["x", TokenType.ARG],
                    [" ", TokenType.Space],
                    ["y", TokenType.ARG],
                    [")", TokenType.RightParen],
                    [")", TokenType.RightParen],
                    ["", TokenType.EOF]
                ])
            })

            it("defines x as 1", () => {
                const expression = "(define x 1)"

                const n = new SchemeParser().tokenize(expression)
                expect(n).toStrictEqual([
                    ["(", TokenType.LeftParen],
                    ["define", TokenType.FunctionName],
                    [" ", TokenType.Space],
                    ["x", TokenType.ARG],
                    [" ", TokenType.Space],
                    ["1", TokenType.ARG],
                    [")", TokenType.RightParen],
                    ["", TokenType.EOF]
                ])

                const tree = new SchemeParser().buildSyntaxTree(expression)

                expect(tree!.children).toHaveLength(3)

                tree!.define()

                expect(Functions.get("x")).toEqual("1")

                const node = new SchemeParser().buildSyntaxTree("x")
                expect(node!.type).toEqual(SyntaxNodeType.Literal)
                expect(node!.value).toEqual('x')
                expect(node!.eval()).toEqual(1)

                const res = new SchemeParser().parse("x")
                expect(res).toEqual(1)
            })

            it("parse define", () => {
                const res = new SchemeParser().buildSyntaxTree("(define (A x y) (+ x y))")
                expect(res!.children.length).toEqual(3)
                expect(res!.children[0].type).toEqual(SyntaxNodeType.Operator)
                expect(Functions.get("A")).toBeUndefined()
                expect(res!.define()).toEqual(undefined)
                expect(Functions.get("A")).toBeDefined()
            })

            it("run defined functions", () => {
                const res = new SchemeParser().parse("(define (A x y) (+ x y))")
                expect(res).toBeUndefined()

                const sum = new SchemeParser().parse("(A 1 1)")
                expect(sum).toEqual(2)
            })
        })

        describe("=", () => {
            it("equals", () => {
                const res = new SchemeParser().parse("(= 1 1)")
                expect(res).toEqual(true)
            })

            it("equals false", () => {
                const res = new SchemeParser().parse("(= 1 0)")
                expect(res).toEqual(false)
            })
        })

        describe("cond", () => {
            const expression = "(define (B a b) (cond ((= a 0) b) (else a)))"

            it('tokenize', () => {
                const res = new SchemeParser().tokenize(expression)
                expect(res).toStrictEqual([
                    ["(", TokenType.LeftParen],
                    ["define", TokenType.FunctionName],
                    [" ", TokenType.Space],
                    ["(", TokenType.LeftParen],
                    ["B", TokenType.FunctionName],
                    [" ", TokenType.Space],
                    ["a", TokenType.ARG],
                    [" ", TokenType.Space],
                    ["b", TokenType.ARG],
                    [")", TokenType.RightParen],
                    [" ", TokenType.Space],
                    ["(", TokenType.LeftParen],
                    ["cond", TokenType.FunctionName],
                    [" ", TokenType.Space],
                    ["(", TokenType.LeftParen],
                    ["(", TokenType.LeftParen],
                    ["=", TokenType.FunctionName],
                    [" ", TokenType.Space],
                    ["a", TokenType.ARG],
                    [" ", TokenType.Space],
                    ["0", TokenType.ARG],
                    [")", TokenType.RightParen],
                    [" ", TokenType.Space],
                    ["b", TokenType.ARG],
                    [")", TokenType.RightParen],
                    [" ", TokenType.Space],
                    ["(", TokenType.LeftParen],
                    ["else", TokenType.FunctionName],
                    [" ", TokenType.Space],
                    ["a", TokenType.ARG],
                    [")", TokenType.RightParen],
                    [")", TokenType.RightParen],
                    [")", TokenType.RightParen],
                    ["", TokenType.EOF]
                ])
            })

            it("else", () => {
                const res = new SchemeParser().buildSyntaxTree(expression)
                expect(res!.children).toHaveLength(3)
                expect(res!.children[2].children).toHaveLength(3)
                expect(res!.children[2].children[1].children).toHaveLength(2)
                expect(res!.children[2].children[2].children).toHaveLength(2)
                expect(res!.define()).toBeUndefined()
                expect(Functions.has('a')).toBeTruthy()
                expect(Functions.has('b')).toBeTruthy()
                expect(Functions.get('a')).toBeUndefined()
                expect(Functions.get('b')).toBeUndefined()

                const elseRes = new SchemeParser().parse("(B 1 2)")
                expect(elseRes).toEqual(1)
            })

            it("not else", () => {
                const res = new SchemeParser().parse("(B 0 2)")
                expect(res).toEqual(2)
            })
        })

        describe("handle new line", () => {
            const define = `(define (C i j)
  (cond ((= j 0) 0)
        ((= i 0) (* 2 j))
        ((= j 1) 2)
        (else (C (- i 1)
                 (C i (- j 1))))))`

            it("(C i j)", () => {
                const res = new SchemeParser().buildSyntaxTree(define)
                expect(res!.define()).toBeUndefined()

                const a11 = new SchemeParser().parse("(C 1 1)")
                expect(a11).toEqual(2)

                expect(new SchemeParser().parse("(C 1 10)")).toEqual(1024)
            })

            it("(* 2 (C (- 1 1) (C 1 (- 7 1))))", () => {
                const resDef = new SchemeParser().buildSyntaxTree(define)
                expect(resDef!.define()).toBeUndefined()

                const res = new SchemeParser().buildSyntaxTree("(* 2 (C (- 1 1) (C 1 (- 7 1))))")
                expect(res!.eval()).toEqual(256)
            })

            describe("explains", () => {
                it("explains (C (- 1 1) (C 1 (- 2 1)))", () => {
                    const defineExplain = new SchemeParser().buildSyntaxTree(define)
                    defineExplain!.defineExplain()

                    const res = new SchemeParser().buildSyntaxTree("(C (- 1 1) (C 1 (- 2 1)))")
                    expect(res!.explain(1)).toEqual("4")
                    expect(res!.explain(2)).toEqual("(C 0 2)")
                    expect(res!.explain(3)).toEqual("(C (- 1 1) (C 1 1))")
                })

                it("explains (C 2 (* 2 2))", () => {
                    const defineExplain = new SchemeParser().buildSyntaxTree(define)
                    defineExplain!.defineExplain()

                    const res = new SchemeParser().buildSyntaxTree("(C 2 (* 2 2))")
                    expect(res!.explain(2)).toEqual("(C 2 4)")
                })

                it("explains", () => {
                    const defineExplain = new SchemeParser().buildSyntaxTree(define)
                    defineExplain!.define()
                    defineExplain!.defineExplain()

                     new SchemeParser().buildSyntaxTree("(C 1 10)")
                    // expect(res!.explain(1)).toEqual("(C (- 1 1) (C 1 (- 10 1)))")

                    // expect(explains(res!)).toStrictEqual([
                    //     "(C (- 1 1) (C 1 (- 10 1)))"
                    // ])
                })
            })
        })
    })
})
