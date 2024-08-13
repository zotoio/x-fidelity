import Joi from 'joi';

export const archetypeSchema = Joi.object({
    rules: Joi.array().items(Joi.string()).required(),
    operators: Joi.array().items(Joi.string()).required(),
    facts: Joi.array().items(Joi.string()).required(),
    config: Joi.object({
        minimumDependencyVersions: Joi.object().pattern(Joi.string(), Joi.string()).required(),
        standardStructure: Joi.object().required(),
        blacklistPatterns: Joi.array().items(Joi.string()).required(),
        whitelistPatterns: Joi.array().items(Joi.string()).required()
    }).required()
});

export const ruleSchema = Joi.object({
    name: Joi.string().required(),
    conditions: Joi.object({
        all: Joi.array().items(Joi.object()),
        any: Joi.array().items(Joi.object())
    }).xor('all', 'any').required(),
    event: Joi.object({
        type: Joi.string().required(),
        params: Joi.object().required()
    }).required()
});
