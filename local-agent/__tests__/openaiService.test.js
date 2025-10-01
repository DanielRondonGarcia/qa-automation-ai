// Mock OpenAI before importing the service
const mockCreate = jest.fn();
const mockOpenAI = {
  responses: {
    create: mockCreate
  }
};

jest.mock('openai', () => {
  return jest.fn(() => mockOpenAI);
});

const OpenAI = require('openai');
const openaiService = require('../openaiService');

describe('OpenAI Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeCode', () => {
    const mockCode = `
      public class TestClass {
        public void TestMethod() {
          var x = 1;
        }
      }
    `;

    const mockRules = [
      {
        id: 1,
        name: 'Variable Naming',
        description: 'Variables should use meaningful names',
        enabled: true
      }
    ];

    it('should successfully analyze code and return findings', async () => {
      const mockResponse = {
        output_text: JSON.stringify({
          findings: [{
            lineNumber: 4,
            codeSnippet: 'var x = 1;',
            issue: 'Variable name is not descriptive',
            suggestion: 'Use a more descriptive variable name',
            reason: 'Improves code readability'
          }]
        })
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await openaiService.analyzeCode(mockCode, mockRules);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        lineNumber: 4,
        codeSnippet: 'var x = 1;',
        issue: 'Variable name is not descriptive',
        suggestion: 'Use a more descriptive variable name',
        reason: 'Improves code readability'
      });

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o',
        input: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.arrayContaining([
              expect.objectContaining({
                type: 'input_text',
                text: expect.stringContaining('You are an expert C# QA code reviewer')
              })
            ])
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.arrayContaining([
              expect.objectContaining({
                type: 'input_text',
                text: expect.stringContaining('Analyze the following C# code snippet')
              })
            ])
          })
        ]),
        text: {
          format: {
            type: 'json_schema',
            name: 'findings_schema',
            strict: true,
            schema: expect.objectContaining({
              type: 'object',
              properties: expect.objectContaining({
                findings: expect.objectContaining({
                  type: 'array'
                })
              })
            })
          }
        },
        max_output_tokens: 2000
      });
    });

    it('should handle legacy array format response', async () => {
      const mockResponse = {
        output_text: JSON.stringify([
          {
            lineNumber: 1,
            codeSnippet: 'legacy code',
            issue: 'Legacy format test',
            suggestion: 'Update format',
            reason: 'Improve code quality'
          }
        ])
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await openaiService.analyzeCode(mockCode, mockRules);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        lineNumber: 1,
        codeSnippet: 'legacy code',
        issue: 'Legacy format test',
        suggestion: 'Update format',
        reason: 'Improve code quality'
      });
    });

    it('should handle empty findings', async () => {
      const mockResponse = {
        output_text: JSON.stringify({
          findings: []
        })
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await openaiService.analyzeCode(mockCode, mockRules);

      expect(result).toEqual([]);
    });

    it('should handle OpenAI API errors', async () => {
      const mockError = new Error('OpenAI API Error');
      mockCreate.mockRejectedValue(mockError);

      await expect(openaiService.analyzeCode(mockCode, mockRules))
        .rejects
        .toThrow('OpenAI API Error');
    });

    it('should handle invalid JSON response', async () => {
      const mockResponse = {
        output_text: 'Invalid JSON response'
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(openaiService.analyzeCode(mockCode, mockRules))
        .rejects
        .toThrow();
    });

    it('should handle missing output_text in response', async () => {
      const mockResponse = {};

      mockCreate.mockResolvedValue(mockResponse);

      await expect(openaiService.analyzeCode(mockCode, mockRules))
        .rejects
        .toThrow();
    });

    it('should validate input parameters', async () => {
      await expect(openaiService.analyzeCode('', mockRules))
        .rejects
        .toThrow();

      await expect(openaiService.analyzeCode(mockCode, []))
        .rejects
        .toThrow();

      await expect(openaiService.analyzeCode(null, mockRules))
        .rejects
        .toThrow();

      await expect(openaiService.analyzeCode(mockCode, null))
        .rejects
        .toThrow();
    });

    it('should include all rules in the prompt', async () => {
      const multipleRules = [
        { id: 1, name: 'Rule 1', description: 'Description 1', enabled: true },
        { id: 2, name: 'Rule 2', description: 'Description 2', enabled: true },
        { id: 3, name: 'Rule 3', description: 'Description 3', enabled: true }
      ];

      const mockResponse = {
        output_text: JSON.stringify({ findings: [] })
      };

      mockCreate.mockResolvedValue(mockResponse);

      await openaiService.analyzeCode(mockCode, multipleRules);

      const callArgs = mockCreate.mock.calls[0][0];
      const systemMessage = callArgs.input.find(msg => msg.role === 'system');
      const systemText = systemMessage.content[0].text;
      
      multipleRules.forEach(rule => {
        expect(systemText).toContain(rule.name);
        expect(systemText).toContain(rule.description);
      });
    });
  });


});