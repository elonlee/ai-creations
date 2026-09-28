extends SceneTree

const Rules = preload("res://scripts/game_rules.gd")
var failures := 0

func _initialize() -> void:
	var game = Rules.new()
	check(game.state.mode == "explore" and game.state.scene == "road", "初始场景")
	check(game.state.hero.level == 1 and game.state.hero.hp == 42, "初始属性")
	game.award_experience(20)
	check(game.state.hero.level == 2 and game.state.hero.max_hp == 48, "升级提升气血")
	check(game.state.hero.max_qi == 7 and game.state.hero.xp == 20, "升级提升内力并保留经验")
	game.new_game()
	game.state.position = Vector2i(5, 6)
	game.interact()
	check(game.state.mode == "dialogue" and game.state.flags.cart_seen, "调查粮车")
	game.choose_dialogue("continue")
	game.choose_dialogue("continue")
	check(game.state.mode == "explore", "对话结束")
	game.start_battle("bandit")
	game.state.battle.enemy_hp = 7
	game.battle_action("strike")
	check(game.state.mode == "explore" and game.state.hero.xp == 15, "战斗胜利经验")
	game.new_game()
	game.state.hero.qi = 0
	game.start_battle("boss")
	game.battle_action("break")
	check(game.state.battle.enemy_hp == 84, "内力不足不消耗回合")
	game.battle_action("escape")
	check(game.state.mode == "battle", "首领战不能逃跑")
	game.state.battle.enemy_hp = 7
	game.battle_action("strike")
	check(game.state.mode == "ending", "首领战进入结局")
	game.debug_jump("boss")
	check(game.state.mode == "dialogue" and game.state.flags.sword_confession, "调试直达首领对话")
	for step in range(8): game.choose_dialogue("continue")
	check(game.state.mode == "battle" and game.state.battle.kind == "boss", "对质结束进入决战")
	game.new_game()
	game.state.encounter_cooldown = 0
	game.move("right", 0.0, 0.9)
	check(game.state.mode == "dialogue" and game.state.dialogue.kind == "refugees" and game.state.dialogue.partner == "refugee", "山路遇见流民并显示立绘")
	for step in range(4): game.choose_dialogue("continue")
	game.choose_dialogue("grain")
	check(game.state.mode == "explore" and game.state.hero.grain == 0 and game.state.hero.xp == 6, "流民分粮")
	game.new_game()
	game.state.scene = "tavern"
	game.state.position = Vector2i(5, 4)
	game.interact()
	check(game.state.flags.shen_story and game.state.hero.xp == 8, "沈棠线索")
	game.state.mode = "explore"
	game.state.scene = "ferry"
	game.state.position = Vector2i(11, 6)
	game.interact()
	check(game.state.flags.ferryman_recognized and game.state.hero.xp == 16, "船工认剑")
	game.state.mode = "explore"
	game.inspect_sword()
	check(game.state.flags.sword_confession and game.state.hero.level == 2, "剑柄供词和升级")
	game.new_game()
	game.start_battle("bandit")
	game.battle_action("guard")
	check(game.state.hero.hp == 39 and game.state.battle.intent == "windup", "守势减伤")
	game.battle_action("break")
	check(game.state.hero.hp == 39 and game.state.battle.enemy_hp == 19, "破招打断蓄势")
	print("游戏规则测试：%d 项失败" % failures)
	quit(1 if failures > 0 else 0)

func check(ok: bool, label: String) -> void:
	if not ok:
		failures += 1
		push_error(label)
