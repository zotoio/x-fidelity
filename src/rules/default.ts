const rule = {
    conditions: {
        all: [
            {
                fact: 'fileContent',
                operator: 'notEqual',
                value: 'someValue'
            }
            // ,
            // {
            //     fact: 'fileContent',
            //     operator: 'greaterThan',
            //     value: 10
            // }
        ]
    },
    event: {  // define the event to fire when conditions evaluate truthy
        type: 'violation',
        params: {
            message: 'Code violation found'
        }
    }
}

export { rule };