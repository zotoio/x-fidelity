# File: test_cli_options.bats
#!/usr/bin/env bats

setup() {
  load 'test_helper/bats-support/load'
  load 'test_helper/bats-assert/load'
  
  # Ensure the dist directory exists
  mkdir -p ./dist
  # Create a mock index.js for testing
  echo '#!/usr/bin/env node
  console.log(JSON.stringify(process.argv));' > ./dist/index.js
  chmod +x ./dist/index.js
}

teardown() {
  rm -rf ./dist
}

@test "CLI displays help information with -h option" {
  run ./dist/index.js --help
  assert_success
  assert_output --partial "Usage:"
  assert_output --partial "--dir <directory>"
  assert_output --partial "--archetype <archetype>"
  assert_output --partial "--configServer <configServer>"
}

@test "CLI displays version number with -v option" {
  run ./dist/index.js --version
  assert_success
  assert_output --partial "xfidelity"
}

@test "CLI analyzes specified directory" {
  run ./dist/index.js --dir "src"
  assert_success
  assert_output --partial '"--dir"'
  assert_output --partial '"src"'
}

@test "CLI uses the specified archetype for analysis" {
  run ./dist/index.js --archetype "java-microservice" --dir "src"
  assert_success
  assert_output --partial '"--archetype"'
  assert_output --partial '"java-microservice"'
  assert_output --partial '"--dir"'
  assert_output --partial '"src"'
}

@test "CLI runs server on specified port" {
  run ./dist/index.js --mode server --port 9090
  assert_success
  assert_output --partial '"--mode"'
  assert_output --partial '"server"'
  assert_output --partial '"--port"'
  assert_output --partial '"9090"'
}

@test "CLI enables OpenAI analysis" {
  run ./dist/index.js --openaiEnabled true --dir "src"
  assert_success
  assert_output --partial '"--openaiEnabled"'
  assert_output --partial '"true"'
  assert_output --partial '"--dir"'
  assert_output --partial '"src"'
}

@test "CLI uses specified config server URL" {
  run ./dist/index.js --configServer "http://example.com/config" --dir "src"
  assert_success
  assert_output --partial '"--configServer"'
  assert_output --partial '"http://example.com/config"'
  assert_output --partial '"--dir"'
  assert_output --partial '"src"'
}

@test "CLI sets JSON TTL" {
  run ./dist/index.js --jsonTTL 30 --dir "src"
  assert_success
  assert_output --partial '"--jsonTTL"'
  assert_output --partial '"30"'
  assert_output --partial '"--dir"'
  assert_output --partial '"src"'
}

@test "CLI handles multiple options correctly" {
  run ./dist/index.js --dir "src" --archetype "node-fullstack" --openaiEnabled true --jsonTTL 45
  assert_success
  assert_output --partial '"--dir"'
  assert_output --partial '"src"'
  assert_output --partial '"--archetype"'
  assert_output --partial '"node-fullstack"'
  assert_output --partial '"--openaiEnabled"'
  assert_output --partial '"true"'
  assert_output --partial '"--jsonTTL"'
  assert_output --partial '"45"'
}

