import json

def addr(value): return "0x" + bytes(value).hex()

DAO = "atlas-dao"
MANDATE = DAO + ".proposal-42"
ACTION = MANDATE + ".action-01"
TARGET = "0x" + "11" * 20
ASSET = "0x" + "22" * 20
RECIPIENT = "0x" + "33" * 20
CALLDATA = "a" * 64
TEXT = "Authorize a one-time payment for the independent security audit only. Recurring streams, grants, swaps, and unrelated transfers are prohibited."
MANIFEST = "One-time payment for the independent security audit; no recurring stream or additional side effect."

def bootstrap(deploy, vm, publisher, executor):
    c = deploy("contracts/mandate_lock.py")
    c.create_dao(DAO)
    c.set_publisher(DAO, addr(publisher), True)
    c.set_executor(DAO, addr(executor), True)
    with vm.prank(publisher):
        c.publish_mandate(MANDATE, DAO, "https://snapshot.org/proposal/42", "proposal-42-final", TEXT, 1, TARGET, ASSET, RECIPIENT, 5000)
    return c

def seal(c, vm, publisher, executor, action=ACTION, value=4000, target=TARGET, manifest=MANIFEST, nonce="nonce-01"):
    with vm.prank(publisher):
        return c.seal_action(action, MANDATE, 1, target, ASSET, RECIPIENT, value, CALLDATA, manifest, addr(executor), nonce)

def mock(vm, verdict="COMPLIANT", violations=None, finding="The exact action is within the authenticated one-time audit mandate.", valid=True):
    vm.mock_llm(r"Judge one treasury action", json.dumps({"verdict": verdict, "violations": violations or [], "finding": finding}))
    vm.mock_llm(r"Independently verify a proposed treasury", json.dumps({"valid": valid}))

def test_schema_and_deployer_has_no_global_authority(direct_deploy, direct_vm, direct_owner, direct_alice):
    c = direct_deploy("contracts/mandate_lock.py")
    assert json.loads(c.get_contract_version())["schema"] == "semantic-treasury-execution-firewall-v1"
    with direct_vm.prank(direct_alice): c.create_dao("reviewer-dao")
    assert json.loads(c.get_dao("reviewer-dao"))["authority"] == addr(direct_alice).lower()
    with direct_vm.expect_revert("DAO_AUTHORITY_REQUIRED"): c.set_executor("reviewer-dao", addr(direct_owner), True)

def test_happy_path_authorizes_and_consumes_exact_permit(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob):
    c = bootstrap(direct_deploy, direct_vm, direct_alice, direct_bob)
    seal(c, direct_vm, direct_alice, direct_bob); mock(direct_vm)
    assert c.assess_action(ACTION) == "COMPLIANT"
    before = json.loads(c.get_action(ACTION)); assert before["status"] == "AUTHORIZED" and before["permit_digest"]
    with direct_vm.prank(direct_bob): out = c.consume_permit(ACTION, CALLDATA, "nonce-01")
    after = json.loads(c.get_action(ACTION)); assert out == before["permit_digest"]
    assert after["status"] == "CONSUMED" and after["consumed"] is True
    assert json.loads(c.get_stats())["open_permits"] == 0

def test_structured_scope_overflow_blocks_without_llm_override(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob):
    c = bootstrap(direct_deploy, direct_vm, direct_alice, direct_bob)
    seal(c, direct_vm, direct_alice, direct_bob, value=7500)
    assert c.assess_action(ACTION) == "SCOPE_EXCEEDED"
    x = json.loads(c.get_action(ACTION)); assert x["status"] == "BLOCKED" and x["violations"] == ["VALUE_EXCEEDS_CAP"] and x["permit_digest"] == ""

def test_wrong_target_blocks_deterministically(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob):
    c = bootstrap(direct_deploy, direct_vm, direct_alice, direct_bob)
    seal(c, direct_vm, direct_alice, direct_bob, target="0x" + "44" * 20)
    assert c.assess_action(ACTION) == "SCOPE_EXCEEDED"
    assert "WRONG_TARGET" in json.loads(c.get_action(ACTION))["violations"]

def test_semantic_contradiction_never_creates_permit(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob):
    c = bootstrap(direct_deploy, direct_vm, direct_alice, direct_bob)
    seal(c, direct_vm, direct_alice, direct_bob, manifest="Create a recurring monthly payment stream for general operations and grants.")
    mock(direct_vm, "CONTRADICTORY", ["RECURRING_PAYMENT"], "A recurring stream contradicts the one-time audit-only mandate.")
    assert c.assess_action(ACTION) == "CONTRADICTORY"
    x = json.loads(c.get_action(ACTION)); assert x["status"] == "BLOCKED" and not x["permit_digest"]

def test_malformed_model_output_fails_closed(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob):
    c = bootstrap(direct_deploy, direct_vm, direct_alice, direct_bob); seal(c, direct_vm, direct_alice, direct_bob)
    direct_vm.mock_llm(r"Judge one treasury action", '{"verdict":"COMPLIANT","violations":["HIDDEN"]}')
    direct_vm.mock_llm(r"Independently verify a proposed treasury", '{"valid":true}')
    assert c.assess_action(ACTION) == "INSUFFICIENT"
    assert json.loads(c.get_action(ACTION))["status"] == "BLOCKED"

def test_pending_action_becomes_stale_after_revision_without_mutation(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob):
    c = bootstrap(direct_deploy, direct_vm, direct_alice, direct_bob); seal(c, direct_vm, direct_alice, direct_bob)
    before = json.loads(c.get_action(ACTION))
    with direct_vm.prank(direct_alice): c.revise_mandate(MANDATE, "https://snapshot.org/proposal/42", "proposal-42-amended", TEXT + " Amendment clarifies reporting.", 1, TARGET, ASSET, RECIPIENT, 5000)
    mock(direct_vm)
    with direct_vm.expect_revert("MANDATE_REVISION_STALE"): c.assess_action(ACTION)
    assert json.loads(c.get_action(ACTION)) == before

def test_open_permit_blocks_revision_until_cancelled(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob):
    c = bootstrap(direct_deploy, direct_vm, direct_alice, direct_bob); seal(c, direct_vm, direct_alice, direct_bob); mock(direct_vm); c.assess_action(ACTION)
    with direct_vm.prank(direct_alice), direct_vm.expect_revert("OPEN_EXECUTION_PERMIT"):
        c.revise_mandate(MANDATE, "https://snapshot.org/proposal/42", "proposal-42-amended", TEXT + " Amendment clarifies reporting.", 1, TARGET, ASSET, RECIPIENT, 5000)
    with direct_vm.prank(direct_alice): c.cancel_action(ACTION)
    assert json.loads(c.get_action(ACTION))["status"] == "CANCELLED"

def test_only_one_pending_action_can_become_authorized(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob):
    c = bootstrap(direct_deploy, direct_vm, direct_alice, direct_bob)
    second = MANDATE + ".action-02"
    seal(c, direct_vm, direct_alice, direct_bob)
    seal(c, direct_vm, direct_alice, direct_bob, action=second, nonce="nonce-02")
    mock(direct_vm)
    assert c.assess_action(ACTION) == "COMPLIANT"
    before = json.loads(c.get_action(second))
    with direct_vm.expect_revert("OPEN_EXECUTION_PERMIT"):
        c.assess_action(second)
    assert json.loads(c.get_action(second)) == before
    assert before["status"] == "PENDING_ASSESSMENT"

def test_wrong_executor_binding_and_replay_fail_without_mutation(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob):
    c = bootstrap(direct_deploy, direct_vm, direct_alice, direct_bob); seal(c, direct_vm, direct_alice, direct_bob); mock(direct_vm); c.assess_action(ACTION)
    before = json.loads(c.get_action(ACTION))
    with direct_vm.expect_revert("ASSIGNED_EXECUTOR_REQUIRED"): c.consume_permit(ACTION, CALLDATA, "nonce-01")
    with direct_vm.prank(direct_bob), direct_vm.expect_revert("PERMIT_BINDING_MISMATCH"): c.consume_permit(ACTION, "b" * 64, "nonce-01")
    assert json.loads(c.get_action(ACTION)) == before
    with direct_vm.prank(direct_bob): c.consume_permit(ACTION, CALLDATA, "nonce-01")
    consumed = json.loads(c.get_action(ACTION))
    with direct_vm.prank(direct_bob), direct_vm.expect_revert("EXECUTION_PERMIT_NOT_AVAILABLE"): c.consume_permit(ACTION, CALLDATA, "nonce-01")
    assert json.loads(c.get_action(ACTION)) == consumed

def test_revoked_executor_cannot_consume(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob):
    c = bootstrap(direct_deploy, direct_vm, direct_alice, direct_bob); seal(c, direct_vm, direct_alice, direct_bob); mock(direct_vm); c.assess_action(ACTION)
    c.set_executor(DAO, addr(direct_bob), False)
    with direct_vm.prank(direct_bob), direct_vm.expect_revert("REGISTERED_EXECUTOR_REQUIRED"): c.consume_permit(ACTION, CALLDATA, "nonce-01")

def test_cross_dao_id_squatting_and_nonce_reuse_are_blocked(direct_deploy, direct_vm, direct_owner, direct_alice, direct_bob):
    c = bootstrap(direct_deploy, direct_vm, direct_alice, direct_bob)
    with direct_vm.prank(direct_bob): c.create_dao("other-dao")
    with direct_vm.prank(direct_alice), direct_vm.expect_revert("MANDATE_DAO_PREFIX_REQUIRED"):
        c.publish_mandate("other-dao.stolen", DAO, "https://snapshot.org/x", "final-x", TEXT, 1, TARGET, ASSET, RECIPIENT, 5)
    seal(c, direct_vm, direct_alice, direct_bob)
    with direct_vm.prank(direct_alice), direct_vm.expect_revert("NONCE_ALREADY_RESERVED"):
        c.seal_action(MANDATE + ".action-02", MANDATE, 1, TARGET, ASSET, RECIPIENT, 1, CALLDATA, MANIFEST, addr(direct_bob), "nonce-01")

def test_exact_pinned_header_is_present():
    assert open("contracts/mandate_lock.py", encoding="utf-8").read().splitlines()[:2] == ["# v0.2.16", '# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }']
