#!/usr/bin/env bats

setup() {
  load './test_helper/bats-support/load'
  load './test_helper/bats-assert/load'
  ln -s ../dist/index.js ./xfidelity
  chmod 755 ./xfidelity
  BATS_TEST_TIMEOUT=10
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
  run ./xfidelity --dir "/home/andrewv/git/x-fidelity/src"
  assert_success
  assert_output --partial "directory: /home/andrewv/git/x-fidelity/src"
}

@test "CLI uses the specified archetype for analysis" {
  run ./xfidelity --archetype "java-microservice" --dir "/home/andrewv/git/x-fidelity/src"
  assert_success
  assert_output --partial "archetype: java-microservice"
  assert_output --partial "directory: /home/andrewv/git/x-fidelity/src"
}

@test "CLI runs server on specified port" {
  ./xfidelity --mode server --port 9079 &
  pid=$!
  
  while ! nc -vz localhost 9079 > /dev/null 2>&1 ; do
      # echo sleeping
      sleep 0.1
  done
  
  curl localhost:9079 || kill "$pid"

  # Kill Pid
  kill $pid
}

@test "CLI enables OpenAI analysis" {
  OPENAI_API_KEY=abc
  run ./xfidelity --openaiEnabled true --dir "../src"
  assert_success
  assert_output --partial "openaiEnabled: true"
}

@test "CLI uses specified config server URL" {
  run ./xfidelity --configServer "http://127.0.0.1/config" --dir "../src"
  assert_success
  assert_output --partial "configServer: http://127.0.0.1/config"
}

@test "CLI sets JSON TTL" {
  run ./xfidelity --jsonTTL 30 --dir "../src"
  assert_success
  assert_output --partial "jsonTTL: 30"
}

@test "CLI handles multiple options correctly" {
  run ./xfidelity --dir "/home/andrewv/git/x-fidelity/src" --archetype "node-fullstack" --jsonTTL 45
  assert_success
  assert_output --partial "directory: /home/andrewv/git/x-fidelity/src"
  assert_output --partial "archetype: node-fullstack"
  assert_output --partial "openaiEnabled: false"
  assert_output --partial "jsonTTL: 45"
  assert_output --partial "mode: client"
}
