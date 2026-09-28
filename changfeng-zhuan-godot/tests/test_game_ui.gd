extends SceneTree

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var main: Control = load("res://scenes/main.tscn").instantiate()
	root.add_child(main)
	await process_frame
	main.screen = "game"
	main.game.new_game()
	main._render()
	main._move("right")
	if main.game.state.position != Vector2i(3, 6):
		push_error("地图按钮未移动一步")
		quit(1)
		return
	main._interact()
	if main.game.state.mode != "dialogue" or not main.game.state.flags.cart_seen:
		push_error("界面调查没有进入粮车对话")
		quit(1)
		return
	main.game.start_battle("bandit")
	main._render()
	await main._battle_action("strike")
	if main.game.state.mode != "battle" or main.game.state.battle.enemy_hp != 21 or main.game.state.hero.hp != 37:
		push_error("战斗按钮或动作播放后状态错误")
		quit(1)
		return
	main.free()
	await create_timer(0.1).timeout
	print("界面操作测试：移动、调查、战斗动作通过")
	quit(0)
