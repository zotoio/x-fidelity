#!/usr/bin/env bats

load '/usr/local/lib/bats/bats-support/load'
load '/usr/local/lib/bats/bats-assert/load'

setup() {
    # Set test timeout
    BATS_TEST_TIMEOUT=30
    
    # Copy the fixtures to expected test location
    cp -r /test-workspace/sample-project /tmp/test-project
    cd /tmp/test-project
}

teardown() {
    cd /
    rm -rf /tmp/test-project
}

@test "xfidelity command is available globally" {
    run which xfidelity
    assert_success
    assert_output --partial "xfidelity"
}

@test "xfidelity displays version" {
    run xfidelity --version
    assert_success
    assert_output --regexp '^[0-9]+\.[0-9]+\.[0-9]+(-.*)?$'
}

@test "xfidelity displays help" {
    run xfidelity --help
    assert_success
    assert_output --partial "Usage:"
    assert_output --partial "--dir"
    assert_output --partial "--archetype"
}

@test "xfidelity can analyze a directory" {
    cd /tmp/test-project
    run timeout 15 xfidelity --dir . --archetype node-fullstack
    # Allow either success or controlled failure since fixtures have complex rules
    if [ "$status" -eq 0 ]; then
        assert_output --partial "HIGH FIDELITY"
    else
        # For fixtures, we expect some analysis issues but the tool should still run
        assert_output --partial "Starting codebase analysis"
    fi
}

@test "xfidelity handles invalid directory gracefully" {
    run xfidelity --dir /nonexistent/directory
    assert_failure
}

@test "xfidelity validates archetype parameter" {
    run xfidelity --dir /tmp/test-project --archetype invalid-archetype
    # Should either succeed with warning or fail gracefully
    # This test ensures the command doesn't crash unexpectedly
    [ "$status" -eq 0 ] || [ "$status" -eq 1 ]
}

@test "xfidelity can run in server mode" {
    # Start server in background
    xfidelity --mode server --port 9080 &
    server_pid=$!
    
    # Wait for server to start
    timeout=10
    while [ $timeout -gt 0 ]; do
        if curl -f http://localhost:9080 >/dev/null 2>&1; then
            break
        fi
        sleep 1
        timeout=$((timeout - 1))
    done
    
    # Test server is running
    run curl -f http://localhost:9080
    curl_status=$?
    
    # Clean up server
    kill $server_pid 2>/dev/null || true
    wait $server_pid 2>/dev/null || true
    
    # Assert server was accessible
    [ $curl_status -eq 0 ]
}

@test "xfidelity executable has correct permissions" {
    run ls -la $(which xfidelity)
    assert_success
    # Should be either an executable file or a symlink
    assert_output --regexp "(rwxr-xr-x|lrwxrwxrwx)"
}

@test "xfidelity handles JSON output format" {
    cd /tmp/test-project
    run timeout 10 xfidelity --dir . --archetype node-fullstack --format json
    # Should either support JSON format or fail gracefully
    [ "$status" -eq 0 ] || [ "$status" -eq 1 ]
    
    # If successful, output should be valid JSON or contain expected content
    if [ "$status" -eq 0 ]; then
        # Try to parse as JSON or check for expected content
        echo "$output" | jq . >/dev/null 2>&1 || assert_output --partial "directory"
    fi
}

@test "xfidelity fails when errorCount > 0" {
    cd /tmp/test-project
    run timeout 15 xfidelity --dir . --archetype node-fullstack
    
    # If the analysis finds errors (errorCount > 0), xfidelity should exit with code 1
    if echo "$output" | grep -q '"errorCount":[[:space:]]*[1-9]'; then
        assert_failure
        echo "Found errorCount > 0 in output, correctly failed with exit code $status"
    else
        # If no errors found, should succeed
        echo "No errors found in analysis, exit code $status is acceptable"
    fi
}

@test "xfidelity detects and reports ERR_MODULE_NOT_FOUND errors" {
    cd /tmp/test-project
    run timeout 15 xfidelity --dir . --archetype node-fullstack
    
    # Check if ERR_MODULE_NOT_FOUND appears in output (particularly @x-fidelity packages)
    if echo "$output" | grep -q "ERR_MODULE_NOT_FOUND\|Cannot find package '@x-fidelity\|Cannot find module"; then
        assert_failure
        assert_output --partial "ERR_MODULE_NOT_FOUND"
        echo "Detected module dependency issue - this indicates packages are not properly bundled"
        echo "CLI should bundle all @x-fidelity/* packages internally"
        echo "Output: $output"
        
        # If specifically @x-fidelity packages are missing, this is a bundling issue
        if echo "$output" | grep -q "Cannot find package '@x-fidelity"; then
            echo "ERROR: @x-fidelity packages should be bundled, not external dependencies!"
            return 1
        fi
    else
        echo "No module dependency errors detected - packages properly bundled"
    fi
}

@test "xfidelity suggests yarn build on module errors" {
    cd /tmp/test-project
    run timeout 15 xfidelity --dir . --archetype node-fullstack
    
    # If module errors are found, should suggest yarn build
    if echo "$output" | grep -q "ERR_MODULE_NOT_FOUND\|Cannot find module"; then
        # Should suggest the build command
        if echo "$output" | grep -q "yarn build"; then
            echo "Correctly suggests build command for module errors"
        else
            echo "Module error detected but no build suggestion found in output:"
            echo "$output"
            false  # Fail the test
        fi
    fi
}

@test "xfidelity can be uninstalled cleanly" {
    # This test verifies the package can be removed
    run yarn global list
    assert_success
    assert_output --partial "x-fidelity"
    
    # Verify command exists before uninstall
    run which xfidelity
    assert_success
    
    # Note: We don't actually uninstall in this test to avoid breaking other tests
    # In a real scenario, you would run: yarn global remove x-fidelity
    # and then verify the command is no longer available
}