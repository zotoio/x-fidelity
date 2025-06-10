import { customFact } from './customFact';

describe('customFact', () => {
    it('should return expected data', async () => {
        const mockAlmanac = {
            factValue: jest.fn()
        };
        const result = await customFact.fn({}, mockAlmanac);
        expect(result).toEqual('custom fact data');
    });
});
