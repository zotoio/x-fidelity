#!/bin/bash

yarn global add bats

git clone https://github.com/bats-core/bats-support.git test_helper/bats-support
git clone https://github.com/bats-core/bats-assert.git test_helper/bats-assert

echo "bats cli testing framework installed. you can now run 'yarn bats:test'"

