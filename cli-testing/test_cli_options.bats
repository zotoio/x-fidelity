#!/usr/bin/env bats

setup() {
  load './test_helper/bats-support/load'
  load './test_helper/bats-assert/load'
  ln -s ../dist/index.js ./xfidelity
  chmod 755 ./xfidelity
  export XFI_DIR="$BATS_TEST_DIRNAME/../src"
}

teardown() {
  ./xfidelity 3>&-
  rm ./xfidelity
}

@test "CLI displays help information with -h option" {
  run ./xfidelity --help
  assert_success
  assert_output --partial "Usage:"
  assert_output --partial "--dir <directory>"
  assert_output --partial "--archetype <archetype>"
  assert_output --partial "--configServer <configServer>"
}

@test "CLI displays version number with -v option" {
  run ./xfidelity --version
  assert_success
  assert_output --regexp '^[0-9]+\.[0-9]+\.[0-9]$'
}

@test "CLI analyzes specified directory" {
  run ./xfidelity --dir "${XFI_DIR}"
  assert_success
  assert_output --partial '"directory: ${XFI_DIR}"'
}

@test "CLI uses the specified archetype for analysis" {
  run ./xfidelity --archetype "java-microservice" --dir "../src"
  assert_success
  assert_output --partial '"--archetype"'
  assert_output --partial '"java-microservice"'
  assert_output --partial '"--dir"'
  assert_output --partial '"../src"'
}

@test "CLI runs server on specified port" {
  run_in_background ./xfidelity --mode server --port 9090
  assert_success
  assert_output --partial '"--mode"'
  assert_output --partial '"server"'
  assert_output --partial '"--port"'
  assert_output --partial '"9090"'
  kill $BATS_BACKGROUND_RUN_PID
}

@test "CLI enables OpenAI analysis" {
  run ./xfidelity --openaiEnabled true --dir "../src"
  assert_success
  assert_output --partial '"--openaiEnabled"'
  assert_output --partial '"true"'
  assert_output --partial '"--dir"'
  assert_output --partial '"../src"'
}

@test "CLI uses specified config server URL" {
  run_in_background ./xfidelity --configServer "http://127.0.0.1/config" --dir "../src"
  assert_success
  assert_output --partial '"--configServer"'
  assert_output --partial '"http://127.0.0.1/config"'
  assert_output --partial '"--dir"'
  assert_output --partial '"../src"'
}

@test "CLI sets JSON TTL" {
  run ./xfidelity --jsonTTL 30 --dir "../src"
  assert_success
  assert_output --partial '"--jsonTTL"'
  assert_output --partial '"30"'
  assert_output --partial '"--dir"'
  assert_output --partial '"../src"'
}

@test "CLI handles multiple options correctly" {
  run ./xfidelity --dir "../src" --archetype "node-fullstack" --openaiEnabled true --jsonTTL 45
  assert_success
  assert_output --partial '"--dir"'
  assert_output --partial '"../src"'
  assert_output --partial '"--archetype"'
  assert_output --partial '"node-fullstack"'
  assert_output --partial '"--openaiEnabled"'
  assert_output --partial '"true"'
  assert_output --partial '"--jsonTTL"'
  assert_output --partial '"45"'
}
