extends RefCounted

const NAMES = {"hero": "陆寒江", "shen": "沈棠", "cheng": "程砚", "ferryman": "老船工", "refugee": "拦路流民", "shen_du": "沈渡", "bandit": "劫道山贼"}
const SCENES = {
	"road": {"name": "荒山驿道", "image": "res://assets/scenes/mountain-road-concept-v1.png", "start": Vector2i(2, 6)},
	"ferry": {"name": "乌篷渡", "image": "res://assets/scenes/wupeng-ferry-concept-v1.png", "start": Vector2i(9, 9)},
	"tavern": {"name": "渡口酒肆", "image": "res://assets/scenes/wine-shop-concept-v1.png", "start": Vector2i(10, 10)},
	"dock": {"name": "夜雨码头", "image": "res://assets/scenes/dock-concept-v1.png", "start": Vector2i(3, 4)},
}
const SITES = {
	"road": [{"id": "cart", "label": "废弃粮车", "pos": Vector2i(5, 6)}, {"id": "ferry", "label": "前往乌篷渡", "pos": Vector2i(18, 6)}],
	"ferry": [{"id": "road", "label": "返回山道", "pos": Vector2i(9, 10)}, {"id": "tavern", "label": "进入酒肆", "pos": Vector2i(5, 3)}, {"id": "ferryman", "label": NAMES.ferryman, "pos": Vector2i(11, 6)}, {"id": "dock", "label": "前往码头", "pos": Vector2i(16, 5)}],
	"tavern": [{"id": "shen", "label": NAMES.shen, "pos": Vector2i(5, 4)}, {"id": "ferry", "label": "返回渡口", "pos": Vector2i(10, 10)}],
	"dock": [{"id": "ferry", "label": "返回渡口", "pos": Vector2i(3, 4)}, {"id": "cheng", "label": NAMES.cheng, "pos": Vector2i(11, 4)}],
}
const INTRO = ["十年前，乌篷渡大水封江。", "一船赈粮失了踪，%s被认作劫粮之人。" % NAMES.shen_du, "十年后，%s接过师父留下的旧剑。" % NAMES.hero, "师父只留下一句话：把剑送回乌篷渡。", "山路渐暗，%s在废弃的粮车前停下脚步。" % NAMES.hero]

var state: Dictionary

func _init() -> void:
	new_game()

func new_game() -> void:
	state = {"scene": "road", "position": Vector2i(2, 6), "facing": "down", "mode": "explore", "hero": {"level": 1, "xp": 0, "hp": 42, "max_hp": 42, "qi": 6, "max_qi": 6, "herbs": 2, "grain": 1}, "flags": {"cart_seen": false, "shen_story": false, "ferryman_recognized": false, "sword_confession": false}, "encounter_cooldown": 4, "battle": {}, "dialogue": {}, "message": "暮色将尽。师父留下的剑，指向乌篷渡。"}

func experience_for_next_level(level: int) -> int:
	return 20 * level + 15 * (level - 1) * level / 2

func award_experience(amount: int) -> void:
	if amount < 0:
		return
	var hero: Dictionary = state.hero
	hero.xp += amount
	while hero.xp >= experience_for_next_level(hero.level):
		hero.level += 1
		hero.max_hp += 6
		hero.hp = mini(hero.max_hp, hero.hp + 6)
		hero.max_qi += 1
		hero.qi = mini(hero.max_qi, hero.qi + 1)

func objective() -> String:
	if not state.flags.cart_seen and state.scene == "road": return "查看路旁粮车，沿驿道前往乌篷渡。"
	if not state.flags.shen_story: return "到渡口酒肆寻找%s，问清赈粮旧事。" % NAMES.shen
	if not state.flags.ferryman_recognized: return "找%s辨认师父留下的佩剑。" % NAMES.ferryman
	if not state.flags.sword_confession: return "检查剑柄，读出藏在其中的供词。"
	return "前往夜雨码头，与%s对质。" % NAMES.cheng

func nearby_site() -> Dictionary:
	if state.mode != "explore": return {}
	var nearest: Dictionary = {}
	var distance := 999
	for site in SITES[state.scene]:
		var delta: Vector2i = site.pos - state.position
		var candidate: int = absi(delta.x) + absi(delta.y)
		if candidate < distance:
			distance = candidate
			nearest = site
	return nearest if distance <= 2 else {}

func is_walkable(scene: String, pos: Vector2i) -> bool:
	var x := pos.x
	var y := pos.y
	if x < 1 or x > 18 or y < 2 or y > 10: return false
	if scene == "road":
		var center := 6
		if x > 5 and x <= 8: center = 5
		elif x > 8 and x <= 11: center = 4
		elif x > 11 and x <= 14: center = 5
		return absi(y - center) <= 1
	if scene == "ferry": return (x >= 2 and x <= 14 and y >= 3 and y <= 8) or (x >= 8 and x <= 11 and y >= 9) or (x >= 15 and x <= 18 and y >= 4 and y <= 6)
	if scene == "tavern": return x >= 2 and x <= 17 and y >= 3 and y <= 10
	if scene == "dock": return (x >= 2 and x <= 12 and y >= 3 and y <= 6) or (x >= 13 and x <= 16 and y >= 3 and y <= 5)
	return false

func move(direction: String, chance: float = -1.0, encounter: float = -1.0) -> void:
	if state.mode != "explore": return
	var deltas := {"up": Vector2i(0, -1), "down": Vector2i(0, 1), "left": Vector2i(-1, 0), "right": Vector2i(1, 0)}
	if not deltas.has(direction): return
	state.facing = direction
	var next: Vector2i = state.position + deltas[direction]
	if not is_walkable(state.scene, next):
		state.message = "前面不能通行。"
		return
	state.position = next
	if state.scene != "road": return
	if state.encounter_cooldown > 0:
		state.encounter_cooldown -= 1
		return
	if (chance if chance >= 0 else randf()) >= 0.18: return
	state.encounter_cooldown = 6
	if (encounter if encounter >= 0 else randf()) < 0.7:
		start_battle("bandit")
	else:
		_talk([_line("refugee", "前面的粮车空了。我们只求一口吃的，你可有余粮？"), _line("hero", "你们从哪儿来？官府没有放粮吗？"), _line("refugee", "说是赈粮到了渡口，等了几日却连一斗都没见着。孩子已饿得走不动了。"), _line("hero", "我正要去查那辆粮车。若有余粮，理该分到你们手里。"), _line("refugee", "那就请你给个准话。眼下这口粮，还是渡口的消息，我们都等不起。")], "refugees", "refugee")

func _line(who: String, words: String) -> Dictionary:
	return {"speaker": NAMES[who], "text": words}

func _talk(lines: Array, kind: String = "story", partner: String = "") -> void:
	state.mode = "dialogue"
	state.dialogue = {"lines": lines, "index": 0, "kind": kind, "partner": partner}
	state.message = lines[0].text

func interact() -> void:
	if state.mode != "explore": return
	var site := nearby_site()
	if site.is_empty():
		state.message = "附近没有可以交谈或调查的地方。"
		return
	var id: String = site.id
	if SCENES.has(id):
		state.scene = id
		state.position = SCENES[id].start
		state.message = "来到%s。" % SCENES[id].name
		return
	if id == "cart":
		if not state.flags.cart_seen: award_experience(3)
		state.flags.cart_seen = true
		_talk([_line("hero", "车板上还留着官仓封泥，车辙却一路指向乌篷渡。"), _line("hero", "赈粮若真在这里卸过，师父让我还剑，恐怕是要我顺着这条路查下去。")])
	elif id == "shen":
		if not state.flags.shen_story: award_experience(8)
		state.flags.shen_story = true
		_talk([_line("hero", "山路上有辆废粮车，还留着官仓封泥。十年前的粮船，真是令尊劫的吗？"), _line("shen", "我爹%s把船拦在渡口。那夜水漫到屋檐，岸上还有几十口人等粮。" % NAMES.shen_du), _line("hero", "若是救人，为何案卷写他私吞赈粮？"), _line("shen", "粮分完后，押运名册被人改了。爹认下罪名，只为让领粮的人活下来。"), _line("hero", "是谁改的名册？"), _line("shen", "爹没说。去找%s吧，他见过那夜上船的人，也许认得你这把剑。" % NAMES.ferryman)], "story", "shen")
	elif id == "ferryman":
		if not state.flags.shen_story:
			_talk([_line("hero", "老人家，你可认得这把剑？"), _line("ferryman", "剑鞘上的旧结眼熟。先去酒肆问问%s，听了她的话，你才知道该问我什么。" % NAMES.shen), _line("hero", "好。我问清十年前的粮船，再来见你。")], "story", "ferryman")
		else:
			if not state.flags.ferryman_recognized: award_experience(8)
			state.flags.ferryman_recognized = true
			_talk([_line("hero", "%s让我来认剑。你见过我师父？" % NAMES.shen), _line("ferryman", "见过。那夜他登船时，剑鞘还挂着青崖门的旧结。"), _line("hero", "他为何一直不肯讲%s的事？" % NAMES.shen_du), _line("ferryman", "他亲眼见%s开仓救人，却没拦住后来改名册的人。" % NAMES.shen_du), _line("hero", "他把什么留下了？"), _line("ferryman", "看剑柄。你师父临走前缠了一层新皮，像在藏一张薄纸。")], "story", "ferryman")
	elif id == "cheng":
		if not state.flags.sword_confession:
			_talk([_line("cheng", "粮船今夜离渡。师弟，你要拦船，总得拿出凭据。"), _line("hero", "%s说，十年前的押运名册被人改过。" % NAMES.shen), _line("cheng", "仅凭传闻，谁也不能停船。去查清旧案，再来见我。")], "story", "cheng")
		else:
			_talk([_line("cheng", "粮船今夜离渡，师弟，让开。"), _line("hero", "师兄先看师父留在剑柄里的供词。%s开仓救人，他亲眼所见。" % NAMES.shen_du), _line("cheng", "这字我认得。但一纸供词，还不足以改十年前的官案。"), _line("hero", "押运名册也被涂改。你守着的船，载的正是当年被扣下的余粮。"), _line("cheng", "我奉命把粮送走。此刻停船，青崖门也会被牵进旧案。"), _line("hero", "那就让渡口的人看清真相。船不能再走。"), _line("cheng", "你要拦我，就先试试手中的剑。"), _line("hero", "这一剑不是为争胜，是替%s和渡口百姓讨一句实话。" % NAMES.shen_du)], "boss", "cheng")

func inspect_sword() -> void:
	if state.mode != "explore" or not state.flags.ferryman_recognized: return
	if not state.flags.sword_confession: award_experience(12)
	state.flags.sword_confession = true
	_talk([_line("hero", "剑柄的皮缠得太紧了。这里面果然藏着一张薄纸。"), _line("hero", "师父的字：%s开仓救人，我亲见。押运粮船之名册，另有涂改。" % NAMES.shen_du), _line("hero", "他把供词藏在剑里，是怕有人先一步毁掉它。该去码头见%s了。" % NAMES.cheng)])

func choose_dialogue(choice: String) -> void:
	if state.mode != "dialogue": return
	var dialogue: Dictionary = state.dialogue
	if choice == "continue":
		if dialogue.index < dialogue.lines.size() - 1:
			dialogue.index += 1
			state.message = dialogue.lines[dialogue.index].text
		elif dialogue.kind == "boss": start_battle("boss")
		elif dialogue.kind != "refugees":
			state.mode = "explore"
			state.dialogue = {}
		return
	if dialogue.kind != "refugees" or dialogue.index != dialogue.lines.size() - 1: return
	if choice == "grain":
		if state.hero.grain < 1:
			state.message = "身上没有余粮。"
			return
		state.hero.grain -= 1
		award_experience(6)
		state.message = "你留下口粮。流民让开山路，指了指渡口的方向。获得 6 点经验。"
	elif choice == "persuade":
		award_experience(4)
		state.message = "你答应到渡口查清赈粮去向。流民迟疑片刻，让开了路。获得 4 点经验。"
	elif choice == "fight":
		start_battle("bandit")
		state.message = "流民退开，藏在后面的山贼拔刀迎战。"
		return
	else: return
	state.mode = "explore"
	state.dialogue = {}

func start_battle(kind: String) -> void:
	if kind != "boss" and kind != "bandit": return
	var hp := 84 if kind == "boss" else 28
	state.mode = "battle"
	state.dialogue = {}
	state.encounter_cooldown = 6
	state.battle = {"kind": kind, "enemy_hp": hp, "max_hp": hp, "round": 0, "intent": "probe"}
	state.message = ("对质已尽。%s横剑守在粮船前，%s拔剑迎战。" % [NAMES.cheng, NAMES.hero]) if kind == "boss" else "山贼拔刀拦路。"

func battle_action(action: String, chance: float = -1.0) -> Array:
	var timeline: Array = []
	if state.mode != "battle": return timeline
	var battle: Dictionary = state.battle
	var hero: Dictionary = state.hero
	if action == "escape" and battle.kind == "boss":
		state.message = "粮船就在眼前，不能退走。"
		return timeline
	if action == "break" and hero.qi < 2:
		state.message = "内力不足，无法破招。"
		return timeline
	if action == "item" and hero.herbs < 1:
		state.message = "药品已用尽。"
		return timeline
	if not ["strike", "break", "guard", "item", "escape"].has(action): return timeline
	if action == "escape" and (chance if chance >= 0 else randf()) < 0.7:
		state.mode = "explore"
		state.battle = {}
		state.message = "你借着山路脱身。"
		return timeline
	var interrupted := false
	var words := ""
	if action == "strike":
		battle.enemy_hp -= 7 + 2 * (hero.level - 1)
		timeline.append("hero-strike")
		words = "%s出剑，命中对手。" % NAMES.hero
	elif action == "break":
		hero.qi -= 2
		interrupted = battle.intent == "windup"
		battle.enemy_hp -= (9 if interrupted else 5) + 2 * (hero.level - 1)
		timeline.append("hero-break")
		words = "%s破开蓄势，打断了对手的招式。" % NAMES.hero if interrupted else "%s抢先破招。" % NAMES.hero
	elif action == "guard":
		hero.qi = mini(hero.max_qi, hero.qi + 1)
		timeline.append("hero-guard")
		words = "%s收剑守势。" % NAMES.hero
	elif action == "item":
		hero.herbs -= 1
		hero.hp = mini(hero.max_hp, hero.hp + 16)
		words = "%s服下金疮药。" % NAMES.hero
	else: words = "退路被山贼堵住。"
	if battle.enemy_hp <= 0:
		var boss: bool = battle.kind == "boss"
		var gained := 40 if boss else 12
		award_experience(gained)
		state.mode = "ending" if boss else "explore"
		state.battle = {}
		state.message = ("%s收剑。供词与名册终于能交到所有人面前，粮船也停了下来。" % NAMES.cheng if boss else "山贼弃刀退入山林。道路暂时安全了。") + " 获得 %d 点经验。" % gained
		return timeline
	if not interrupted:
		var damage := (12 if battle.intent == "windup" else 8) if battle.kind == "boss" else (9 if battle.intent == "windup" else 5)
		if action == "guard": damage = mini(3, damage)
		hero.hp = maxi(0, hero.hp - damage)
		timeline.append("enemy-guarded" if action == "guard" else "enemy-strike")
		words += " 对手还击，%s受到 %d 点伤害。" % [NAMES.hero, damage]
	if hero.hp <= 0:
		state.mode = "defeat"
		state.battle = {}
		state.message = "%s倒下，旧案尚未昭雪。" % NAMES.hero
		return timeline
	battle.round += 1
	battle.intent = "windup" if battle.round % 3 == 1 else "probe"
	state.message = words
	return timeline

func debug_jump(point: String) -> void:
	new_game()
	match point:
		"intro": state.mode = "intro"
		"ferry":
			state.scene = "ferry"
			state.position = SCENES.ferry.start
		"tavern":
			state.scene = "tavern"
			state.position = Vector2i(5, 4)
		"dock":
			state.scene = "dock"
			state.position = SCENES.dock.start
		"dialogue":
			state.scene = "tavern"
			state.position = Vector2i(5, 4)
			interact()
		"battle": start_battle("bandit")
		"boss":
			state.scene = "dock"
			state.position = Vector2i(11, 4)
			state.flags = {"cart_seen": true, "shen_story": true, "ferryman_recognized": true, "sword_confession": true}
			interact()
		"ending": state.mode = "ending"
		"defeat": state.mode = "defeat"
