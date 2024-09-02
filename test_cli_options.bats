# File: test_cli_options.bats

#!/usr/bin/env bats

# Test help option
@test "CLI displays help information with -h option" {
  run ./dist/index.js --help
  [ "$status" -eq 0 ]
  [[ "$output" =~ "Usage:" ]]
  [[ "$output" =~ "--dir <directory>" ]]
  [[ "$output" =~ "--archetype <archetype>" ]]
  [[ "$output" =~ "--configServer <configServer>" ]]
}

# Test version option
@test "CLI displays version number with -v option" {
  run ./dist/index.js --version
  [ "$status" -eq 0 ]
  [[ "$output" =~ "xfidelity" ]]
}

# Test directory analysis
@test "CLI analyzes specified directory" {
  run ./dist/index.js --dir "src"
  [ "$status" -eq 0 ]
  [[ "$output" =~ "Analyzing directory src" ]]
}

# Test archetype option
@test "CLI uses the specified archetype for analysis" {
  run ./dist/index.js --archetype "java-microservice" --dir "src"
  [ "$status" -eq 0 ]
  [[ "$output" =~ "Archetype 'java-microservice' configured successfully" ]]
}

# Test running server on specified port
@test "CLI runs server on specified port" {
  run ./dist/index.js --mode server --port 9090
  [ "$status" -eq 0 ]
  [[ "$output" =~ "Server running on port 9090" ]]
}

# Test enabling OpenAI analysis
@test "CLI enables OpenAI analysis" {
  run ./dist/index.js --openaiEnabled true --dir "src"
  [ "$status" -eq 0 ]
  [[ "$output" =~ "OpenAI analysis enabled" ]]
}

# Test specifying config server URL
@test "CLI uses specified config server URL" {
  run ./dist/index.js --configServer "http://example.com/config" --dir "src"
  [ "$status" -eq 0 ]
  [[ "$output" =~ "Fetching config from http://example.com/config" ]]
}

# Test setting JSON TTL
@test "CLI sets JSON TTL" {
  run ./dist/index.js --jsonTTL 30 --dir "src"
  [ "$status" -eq 0 ]
  [[ "$output" =~ "JSON cache TTL set to 30 minutes" ]]
}

