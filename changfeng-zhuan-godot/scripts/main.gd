extends Control

const Rules = preload("res://scripts/game_rules.gd")
const AudioDirector = preload("res://scripts/audio_director.gd")
const UI_FONT = preload("res://assets/fonts/NotoSansCJKsc-Regular.otf")
const INK = Color("0d1118")
const CREAM = Color("f5e9ca")
const GOLD = Color("d7ae65")
const MUTED = Color("b9b9ac")
const RED = Color("a84841")
const PORTRAITS = {"shen": "shen-tang-v1-mirrored.png", "ferryman": "old-ferryman-v1-mirrored.png", "cheng": "cheng-yan-v1.png", "refugee": "road-refugee-v1-mirrored.png"}
const WALK_FRAMES = {"down": [0, 1, 2], "left": [3, 4, 5], "right": [6, 7, 8], "up": [9, 10, 11]}
const ACTORS = {"hero": "lu-zhao", "bandit": "road-bandit", "boss": "cheng-yan"}

var game = Rules.new()
var screen := "menu"
var intro_index := 0
var intro_time := 0.0
var walk_time := 0.0
var walk_frame := 0
var moving_time := 0.0
var locked := false
var hero_sprite: TextureRect
var enemy_sprite: TextureRect
var audio_director: Node
var audio_toggle: Button

func _ready() -> void:
	audio_director = AudioDirector.new()
	add_child(audio_director)
	_render()
	var args := OS.get_cmdline_user_args()
	for argument in args:
		if argument.begins_with("--debug="):
			var point := argument.trim_prefix("--debug=")
			game.debug_jump(point)
			screen = "game"
			_render()
			break

func _process(delta: float) -> void:
	if screen != "game": return
	if game.state.mode == "intro":
		intro_time += delta
		if intro_time >= 3.4:
			_next_intro()
	elif game.state.mode == "explore" and is_instance_valid(hero_sprite) and moving_time > 0:
		moving_time -= delta
		walk_time += delta
		if walk_time >= 0.11:
			walk_time = 0
			walk_frame = (walk_frame + 1) % 3
			_set_walk_frame()
		if moving_time <= 0:
			walk_frame = 1
			_set_walk_frame()

func _unhandled_input(event: InputEvent) -> void:
	if not event is InputEventKey or not event.pressed or event.echo: return
	var key: Key = event.keycode
	if key == KEY_M:
		_toggle_audio()
		return
	if locked: return
	if screen == "menu":
		if key == KEY_ENTER or key == KEY_SPACE: _start_game()
		return
	if screen == "instructions":
		if key == KEY_ESCAPE or key == KEY_ENTER: screen = "menu"; _render()
		return
	match game.state.mode:
		"intro":
			if key == KEY_ENTER or key == KEY_SPACE: _next_intro()
		"explore":
			var direction := ""
			if key == KEY_W or key == KEY_UP: direction = "up"
			elif key == KEY_S or key == KEY_DOWN: direction = "down"
			elif key == KEY_A or key == KEY_LEFT: direction = "left"
			elif key == KEY_D or key == KEY_RIGHT: direction = "right"
			if direction != "": _move(direction)
			elif key == KEY_E or key == KEY_ENTER or key == KEY_SPACE: _interact()
			elif key == KEY_Q: game.inspect_sword(); _render()
		"dialogue":
			if key == KEY_ENTER or key == KEY_SPACE: _continue_dialogue()
		"ending", "defeat":
			if key == KEY_ENTER or key == KEY_SPACE: screen = "menu"; _render()

func _clear() -> void:
	hero_sprite = null
	enemy_sprite = null
	for child in get_children():
		if child != audio_director: child.queue_free()

func _render() -> void:
	audio_director.sync(screen, game.state.mode)
	_clear()
	if screen == "menu": _render_menu()
	elif screen == "instructions": _render_instructions()
	elif game.state.mode == "intro": _render_intro()
	elif game.state.mode == "explore": _render_explore()
	elif game.state.mode == "dialogue": _render_dialogue()
	elif game.state.mode == "battle": _render_battle()
	else: _render_ending()
	_render_audio_toggle()

func _render_audio_toggle() -> void:
	audio_toggle = _button(self, "声音：关" if audio_director.muted else "声音：开", Rect2(1092, 133, 164, 42), _toggle_audio)
	audio_toggle.add_theme_font_size_override("font_size", 18)

func _toggle_audio() -> void:
	audio_director.set_muted(not audio_director.muted)
	if is_instance_valid(audio_toggle):
		audio_toggle.text = "声音：关" if audio_director.muted else "声音：开"

func _box(parent: Node, rect: Rect2, color: Color, border: Color = Color.TRANSPARENT, width: int = 0) -> Panel:
	var panel := Panel.new()
	panel.position = rect.position
	panel.size = rect.size
	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.border_color = border
	style.set_border_width_all(width)
	style.set_corner_radius_all(8)
	panel.add_theme_stylebox_override("panel", style)
	parent.add_child(panel)
	return panel

func _label(parent: Node, words: String, rect: Rect2, size: int = 24, color: Color = CREAM, align: HorizontalAlignment = HORIZONTAL_ALIGNMENT_LEFT) -> Label:
	var label := Label.new()
	label.text = words
	label.position = rect.position
	label.size = rect.size
	label.horizontal_alignment = align
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_font_override("font", UI_FONT)
	label.add_theme_color_override("font_color", color)
	parent.add_child(label)
	return label

func _button(parent: Node, words: String, rect: Rect2, callback: Callable, primary: bool = false) -> Button:
	var button := Button.new()
	button.text = words
	button.position = rect.position
	button.size = rect.size
	button.focus_mode = Control.FOCUS_ALL
	button.add_theme_font_size_override("font_size", 21)
	button.add_theme_font_override("font", UI_FONT)
	button.add_theme_color_override("font_color", INK if primary else CREAM)
	button.add_theme_color_override("font_hover_color", INK if primary else GOLD)
	var style := StyleBoxFlat.new()
	style.bg_color = GOLD if primary else Color("18232b")
	style.border_color = GOLD
	style.set_border_width_all(1)
	style.set_corner_radius_all(5)
	button.add_theme_stylebox_override("normal", style)
	var hover := style.duplicate()
	hover.bg_color = Color("efcd86") if primary else Color("30424c")
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("pressed", hover)
	parent.add_child(button)
	button.pressed.connect(callback)
	return button

func _image(parent: Node, path: String, rect: Rect2, mode: TextureRect.ExpandMode = TextureRect.EXPAND_IGNORE_SIZE, stretch: TextureRect.StretchMode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED) -> TextureRect:
	var image := TextureRect.new()
	image.texture = load(path)
	image.expand_mode = mode
	image.stretch_mode = stretch
	image.position = rect.position
	image.size = rect.size
	image.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(image)
	return image

func _shade(parent: Node, rect: Rect2, color: Color) -> void:
	var shade := ColorRect.new()
	shade.position = rect.position
	shade.size = rect.size
	shade.color = color
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(shade)

func _background(scene: String, darkness: float = 0.3) -> void:
	_image(self, Rules.SCENES[scene].image, Rect2(0, 0, 1280, 720), TextureRect.EXPAND_IGNORE_SIZE, TextureRect.STRETCH_KEEP_ASPECT_COVERED)
	_shade(self, Rect2(0, 0, 1280, 720), Color(0.02, 0.035, 0.05, darkness))

func _render_menu() -> void:
	_background("dock", 0.66)
	_box(self, Rect2(0, 0, 505, 720), Color("d90b1118"))
	_label(self, "像素武侠 · 剧情探索", Rect2(74, 105, 380, 32), 20, GOLD)
	_label(self, "长风传", Rect2(68, 168, 400, 112), 84)
	_label(self, "旧剑归渡 · 第一章", Rect2(75, 280, 390, 45), 29, GOLD)
	_label(self, "一纸供词，十年沉冤。\n随%s踏上乌篷渡的山路。" % Rules.NAMES.hero, Rect2(76, 342, 385, 94), 23, MUTED)
	_button(self, "开始游戏  →", Rect2(76, 476, 336, 60), _start_game, true)
	_button(self, "游戏说明", Rect2(76, 552, 336, 54), func(): screen = "instructions"; _render())
	_label(self, "GODOT 4  ·  GDSCRIPT", Rect2(810, 664, 410, 28), 16, CREAM, HORIZONTAL_ALIGNMENT_RIGHT)

func _render_instructions() -> void:
	_background("ferry", 0.75)
	_box(self, Rect2(226, 72, 828, 575), Color("eb0d1118"), GOLD, 1)
	_label(self, "游戏说明", Rect2(282, 110, 700, 55), 41, GOLD)
	_label(self, "移动：方向键 / WASD，也可点右下角方向按钮。\n调查或交谈：E / 空格 / 回车，或点“交谈 / 调查”。\n在%s认出佩剑后，按 Q 或点“检查剑柄”。\n点击半透明对话框可继续剧情。\n\n山路可能遭遇山贼或流民。战斗中可出剑、破招、守势、服药；观察对手蓄势，再决定何时破招。\n\n气血归零会失败。探索和战斗可获得经验并升级。" % Rules.NAMES.ferryman, Rect2(282, 188, 714, 332), 22)
	_button(self, "返回主界面", Rect2(282, 553, 225, 56), func(): screen = "menu"; _render(), true)

func _start_game() -> void:
	game.new_game()
	screen = "game"
	game.state.mode = "intro"
	intro_index = 0
	intro_time = 0
	_render()

func _render_intro() -> void:
	_shade(self, Rect2(0, 0, 1280, 720), INK)
	_label(self, "长风传", Rect2(0, 110, 1280, 64), 43, GOLD, HORIZONTAL_ALIGNMENT_CENTER)
	_label(self, Rules.INTRO[intro_index], Rect2(225, 284, 830, 150), 34, CREAM, HORIZONTAL_ALIGNMENT_CENTER)
	_label(self, "点击画面或按空格继续  ·  %d / %d" % [intro_index + 1, Rules.INTRO.size()], Rect2(0, 620, 1280, 35), 18, MUTED, HORIZONTAL_ALIGNMENT_CENTER)
	var click := Button.new()
	click.flat = true
	click.position = Vector2.ZERO
	click.size = Vector2(1280, 720)
	click.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	add_child(click)
	click.pressed.connect(_next_intro)

func _next_intro() -> void:
	intro_index += 1
	intro_time = 0
	if intro_index >= Rules.INTRO.size(): game.state.mode = "explore"
	_render()

func _header() -> void:
	_box(self, Rect2(20, 17, 1240, 88), Color("e80d1118"), Color("5b5040"), 1)
	_label(self, Rules.SCENES[game.state.scene].name, Rect2(45, 30, 280, 35), 29, GOLD)
	_label(self, game.objective(), Rect2(340, 30, 610, 32), 19, CREAM)
	var h: Dictionary = game.state.hero
	_label(self, "%s  ·  Lv.%d  ·  经验 %d/%d" % [Rules.NAMES.hero, h.level, h.xp, game.experience_for_next_level(h.level)], Rect2(730, 65, 510, 29), 18, MUTED, HORIZONTAL_ALIGNMENT_RIGHT)
	_label(self, "气血 %d/%d    内力 %d/%d" % [h.hp, h.max_hp, h.qi, h.max_qi], Rect2(986, 28, 260, 31), 19, CREAM, HORIZONTAL_ALIGNMENT_RIGHT)

func _map_point(pos: Vector2i) -> Vector2:
	if game.state.scene == "road":
		return Vector2(100 + (pos.x - 1) * 60, 135 + (pos.y - 2) * 52)
	return Vector2(42 + (pos.x - 1) * 69, 135 + (pos.y - 2) * 52)

func _render_explore() -> void:
	_background(game.state.scene, 0.18)
	_header()
	for site in Rules.SITES[game.state.scene]:
		var point := _map_point(site.pos)
		_box(self, Rect2(point.x + 25, point.y - 29, 13, 13), GOLD, CREAM, 1)
		_label(self, site.label, Rect2(point.x - 57, point.y - 59, 175, 28), 17, CREAM, HORIZONTAL_ALIGNMENT_CENTER)
	var hero_point := _map_point(game.state.position)
	hero_sprite = _image(self, "res://assets/sprites/frame-%02d.png" % WALK_FRAMES[game.state.facing][1], Rect2(hero_point.x, hero_point.y - 37, 80, 91))
	_box(self, Rect2(20, 589, 1240, 111), Color("ea0d1118"), Color("5b5040"), 1)
	_label(self, game.state.message, Rect2(44, 601, 780, 60), 21)
	var site := game.nearby_site()
	var action := "交谈 / 调查" if site.is_empty() else "交谈 / 调查：%s" % site.label
	_button(self, action, Rect2(865, 607, 376, 44), _interact, true)
	if game.state.flags.ferryman_recognized and not game.state.flags.sword_confession:
		_button(self, "检查剑柄  Q", Rect2(865, 655, 180, 38), func(): game.inspect_sword(); _render())
	_label(self, "WASD / 方向键移动 · E 交谈", Rect2(46, 656, 550, 26), 16, MUTED)
	_render_dpad()

func _render_dpad() -> void:
	var x := 1078
	var y := 453
	_button(self, "↑", Rect2(x + 49, y, 48, 40), func(): _move("up"))
	_button(self, "←", Rect2(x, y + 43, 48, 40), func(): _move("left"))
	_button(self, "↓", Rect2(x + 49, y + 43, 48, 40), func(): _move("down"))
	_button(self, "→", Rect2(x + 98, y + 43, 48, 40), func(): _move("right"))

func _set_walk_frame() -> void:
	if is_instance_valid(hero_sprite):
		var number: int = WALK_FRAMES[game.state.facing][walk_frame]
		hero_sprite.texture = load("res://assets/sprites/frame-%02d.png" % number)

func _move(direction: String) -> void:
	if locked: return
	game.move(direction)
	moving_time = 0.34
	walk_frame = 0
	_render()

func _interact() -> void:
	game.interact()
	_render()

func _render_dialogue() -> void:
	_background(game.state.scene, 0.43)
	_header()
	var dialogue: Dictionary = game.state.dialogue
	var current: Dictionary = dialogue.lines[dialogue.index]
	_image(self, "res://assets/portraits/lu-zhao-v1.png", Rect2(20, 258, 300, 420))
	if dialogue.partner != "":
		_image(self, "res://assets/portraits/%s" % PORTRAITS[dialogue.partner], Rect2(960, 258, 300, 420))
	_box(self, Rect2(325, 475, 630, 204), Color("ce0a1119"), GOLD, 1)
	_label(self, current.speaker, Rect2(354, 492, 560, 32), 26, GOLD)
	_label(self, current.text, Rect2(354, 533, 568, 103), 22)
	_label(self, "点击对话框继续  ›", Rect2(674, 646, 242, 20), 16, MUTED, HORIZONTAL_ALIGNMENT_RIGHT)
	var hit := Button.new()
	hit.flat = true
	hit.position = Vector2(325, 475)
	hit.size = Vector2(630, 204)
	hit.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	add_child(hit)
	hit.pressed.connect(_continue_dialogue)
	if dialogue.kind == "refugees" and dialogue.index == dialogue.lines.size() - 1:
		_button(self, "留下口粮", Rect2(338, 397, 185, 54), func(): _choose("grain"), true)
		_button(self, "答应查案", Rect2(544, 397, 185, 54), func(): _choose("persuade"))
		_button(self, "拔剑迎战", Rect2(750, 397, 185, 54), func(): _choose("fight"))

func _continue_dialogue() -> void:
	game.choose_dialogue("continue")
	_render()

func _choose(choice: String) -> void:
	game.choose_dialogue(choice)
	_render()

func _render_battle() -> void:
	_background(game.state.scene, 0.53)
	var b: Dictionary = game.state.battle
	var h: Dictionary = game.state.hero
	var foe := Rules.NAMES.cheng if b.kind == "boss" else Rules.NAMES.bandit
	_box(self, Rect2(22, 20, 1236, 103), Color("e80d1118"), GOLD, 1)
	_label(self, "%s  ·  Lv.%d  ·  经验 %d/%d" % [Rules.NAMES.hero, h.level, h.xp, game.experience_for_next_level(h.level)], Rect2(49, 36, 530, 33), 24, CREAM)
	_label(self, "气血  %d / %d     内力  %d / %d" % [h.hp, h.max_hp, h.qi, h.max_qi], Rect2(48, 76, 590, 30), 22, GOLD)
	_label(self, "%s   气血 %d / %d" % [foe, b.enemy_hp, b.max_hp], Rect2(740, 42, 480, 34), 24, CREAM, HORIZONTAL_ALIGNMENT_RIGHT)
	_label(self, "对手动向：%s" % ("正在蓄势，破招可打断" if b.intent == "windup" else "试探出手"), Rect2(780, 78, 440, 27), 19, RED if b.intent == "windup" else MUTED, HORIZONTAL_ALIGNMENT_RIGHT)
	hero_sprite = _image(self, "res://assets/battle/lu-zhao-stance-v1.png", Rect2(111, 173, 350, 367))
	enemy_sprite = _image(self, "res://assets/battle/%s-stance-v1.png" % ACTORS[b.kind], Rect2(811, 173, 350, 367))
	_box(self, Rect2(20, 552, 1240, 148), Color("ed0d1118"), Color("5b5040"), 1)
	_label(self, game.state.message, Rect2(43, 558, 1170, 50), 20)
	var actions := [["出剑", "strike"], ["破招  ·  2 内力", "break"], ["守势  ·  回内力", "guard"], ["服药", "item"], ["退走", "escape"]]
	for i in range(actions.size()):
		var action: String = actions[i][1]
		var button := _button(self, actions[i][0], Rect2(42 + i * 244, 623, 224, 54), func(): _battle_action(action), i == 0)
		if action == "escape" and b.kind == "boss": button.disabled = true
		if action == "item" and h.herbs == 0: button.disabled = true

func _battle_action(action: String) -> void:
	if locked: return
	locked = true
	var kind: String = game.state.battle.kind
	var timeline := game.battle_action(action)
	if timeline.is_empty():
		locked = false
		_render()
		return
	for event in timeline:
		if event == "hero-strike" or event == "hero-break":
			audio_director.play_event(event)
			await _animate_actor(hero_sprite, ACTORS.hero, "attack")
			audio_director.play_event("hit")
			await _animate_actor(enemy_sprite, ACTORS[kind], "hit")
		elif event == "hero-guard":
			audio_director.play_event(event)
			await _animate_actor(hero_sprite, ACTORS.hero, "guard")
		elif event == "enemy-strike":
			audio_director.play_event(event)
			await _animate_actor(enemy_sprite, ACTORS[kind], "attack")
			audio_director.play_event("hit")
			await _animate_actor(hero_sprite, ACTORS.hero, "hit")
		elif event == "enemy-guarded":
			audio_director.play_event("enemy-strike")
			await _animate_actor(enemy_sprite, ACTORS[kind], "attack")
			audio_director.play_event(event)
			await _animate_actor(hero_sprite, ACTORS.hero, "guard")
	locked = false
	_render()

func _animate_actor(sprite: TextureRect, actor: String, motion: String) -> void:
	for frame in range(4):
		if not is_instance_valid(sprite): return
		sprite.texture = load("res://assets/battle/%s-%s-%d.png" % [actor, motion, frame])
		await get_tree().create_timer(0.1).timeout
	if is_instance_valid(sprite): sprite.texture = load("res://assets/battle/%s-stance-v1.png" % actor)

func _render_ending() -> void:
	_background("dock", 0.73)
	var won: bool = game.state.mode == "ending"
	_box(self, Rect2(224, 105, 832, 514), Color("e80d1118"), GOLD, 1)
	_label(self, "第一章 · 剑归乌篷渡" if won else "旧案未终", Rect2(270, 149, 740, 60), 46, GOLD, HORIZONTAL_ALIGNMENT_CENTER)
	var copy := ("%s收剑，粮船停在雨中的码头。\n\n%s将师父留下的供词摊开，%s认出了十年前的押运名册。渡口的人终于有机会听见%s开仓救人的真相。\n\n%s知道，旧案还未真正了结。但今夜，粮没有再被运走。" % [Rules.NAMES.cheng, Rules.NAMES.shen, Rules.NAMES.ferryman, Rules.NAMES.shen_du, Rules.NAMES.hero]) if won else ("%s倒在码头。粮船离渡，师父留下的供词还没交到众人手中。\n\n山路与旧案仍在，或许可以重新出发。" % Rules.NAMES.hero)
	_label(self, copy, Rect2(295, 226, 690, 252), 24, CREAM, HORIZONTAL_ALIGNMENT_CENTER)
	_label(self, game.state.message, Rect2(285, 482, 710, 44), 17, MUTED, HORIZONTAL_ALIGNMENT_CENTER)
	_button(self, "返回主界面", Rect2(477, 544, 326, 53), func(): screen = "menu"; _render(), true)
