import {getTokenType, readToEnd, SchemeParser, SyntaxNode, SyntaxNodeType, TokenType} from "../../src/parsers/scheme"

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
            it("tokenize", () => {
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
        })

        describe("explain", () => {
            it.skip("explains", () => {
                const n = new SchemeParser().buildSyntaxTree("(+ 1 (- 1 1))")
                expect(n!.explain()).toEqual(`(+ 1 (- 1 1))
(+ 1 0)
`)
            })
        })
    })
})
