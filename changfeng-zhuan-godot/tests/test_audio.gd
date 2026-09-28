extends SceneTree

const AudioDirector = preload("res://scripts/audio_director.gd")
var failures := 0

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var director = AudioDirector.new()
	root.add_child(director)
	await process_frame
	_assert(director.cue_for("menu", "explore") == "menu", "主菜单音乐")
	_assert(director.cue_for("game", "intro") == "menu", "序幕音乐")
	_assert(director.cue_for("game", "explore") == "explore", "探索音乐")
	_assert(director.cue_for("game", "dialogue") == "explore", "对话音乐")
	_assert(director.cue_for("game", "battle") == "battle", "战斗音乐")
	_assert(director.cue_for("game", "ending") == "menu", "结局音乐")
	_assert(director.effect_for("hero-strike") == "attack", "普通攻击音效")
	_assert(director.effect_for("hero-break") == "skill", "破招音效")
	_assert(director.effect_for("hero-guard") == "guard", "守势音效")
	_assert(director.effect_for("enemy-strike") == "attack", "敌方攻击音效")
	_assert(director.effect_for("enemy-guarded") == "guard", "格挡音效")
	_assert(director.effect_for("hit") == "hit", "受击音效")
	for cue in ["menu", "explore", "battle"]:
		_assert(director.tracks.has(cue) and director.tracks[cue] is AudioStreamMP3, "音乐 MP3 可加载：" + cue)
	for effect in ["attack", "skill", "guard", "hit"]:
		_assert(director.effects.has(effect) and director.effects[effect] is AudioStreamMP3, "音效 MP3 可加载：" + effect)
	director.sync("game", "explore")
	var first_stream: AudioStream = director.music_player.stream
	director.sync("game", "dialogue")
	_assert(director.music_player.stream == first_stream, "对话不重启探索音乐")
	director.sync("game", "battle")
	_assert(director.current_cue == "battle", "进入战斗切换音乐")
	director.play_event("hero-strike")
	_assert(director.effect_player.stream == director.effects.attack, "动作触发音效")
	director.set_muted(true)
	_assert(director.music_player.stream_paused and not director.effect_player.playing, "静音暂停音乐并停止音效")
	director.play_event("hit")
	_assert(not director.impact_player.playing, "静音时不触发新音效")
	director.set_muted(false)
	_assert(not director.music_player.stream_paused, "恢复音乐")
	var main: Control = load("res://scenes/main.tscn").instantiate()
	root.add_child(main)
	await process_frame
	_assert(is_instance_valid(main.audio_director), "界面持有音频管理节点")
	var mute_key := InputEventKey.new()
	mute_key.keycode = KEY_M
	mute_key.pressed = true
	main._unhandled_input(mute_key)
	_assert(main.audio_director.muted and main.audio_toggle.text == "声音：关", "M 键静音并更新按钮")
	main._unhandled_input(mute_key)
	_assert(not main.audio_director.muted and main.audio_toggle.text == "声音：开", "M 键恢复声音")
	var live_director: Node = main.audio_director
	main.screen = "game"
	main.game.new_game()
	main._render()
	_assert(main.audio_director == live_director and live_director.current_cue == "explore", "重绘界面保留音乐节点")
	main.game.start_battle("bandit")
	main._render()
	_assert(live_director.current_cue == "battle", "战斗界面切换音乐")
	await main._battle_action("strike")
	_assert(live_director.effect_player.stream != null, "战斗动作播放音效")
	main.free()
	director.free()
	await create_timer(0.5).timeout
	if failures == 0: print("音频测试：场景音乐、动作音效、静音与界面切换通过")
	quit(1 if failures else 0)

func _assert(condition: bool, message: String) -> void:
	if condition: return
	push_error("音频测试失败：" + message)
	failures += 1
