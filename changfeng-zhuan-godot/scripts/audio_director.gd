extends Node

var tracks: Dictionary = {}
var effects: Dictionary = {}
var music_player: AudioStreamPlayer
var effect_player: AudioStreamPlayer
var impact_player: AudioStreamPlayer
var current_cue := ""
var muted := false

func _ready() -> void:
	for cue in ["menu", "explore", "battle"]:
		var stream: AudioStreamMP3 = load("res://assets/audio/%s.mp3" % cue)
		stream.loop = true
		tracks[cue] = stream
	for effect in ["attack", "skill", "guard", "hit"]:
		effects[effect] = load("res://assets/audio/%s.mp3" % effect)
	music_player = AudioStreamPlayer.new()
	music_player.name = "Music"
	music_player.volume_db = -18.0
	add_child(music_player)
	effect_player = AudioStreamPlayer.new()
	effect_player.name = "ActionEffect"
	effect_player.volume_db = -5.0
	add_child(effect_player)
	impact_player = AudioStreamPlayer.new()
	impact_player.name = "ImpactEffect"
	impact_player.volume_db = -5.0
	add_child(impact_player)

func cue_for(screen: String, mode: String) -> String:
	if screen == "menu" or screen == "instructions" or mode == "intro" or mode == "ending" or mode == "defeat":
		return "menu"
	if mode == "battle": return "battle"
	return "explore"

func effect_for(event: String) -> String:
	match event:
		"hero-strike", "enemy-strike": return "attack"
		"hero-break": return "skill"
		"hero-guard", "enemy-guarded": return "guard"
		"hit": return "hit"
	return ""

func sync(screen: String, mode: String) -> void:
	var cue := cue_for(screen, mode)
	if cue == current_cue: return
	current_cue = cue
	music_player.stop()
	music_player.stream = tracks[cue]
	music_player.play()
	music_player.stream_paused = muted

func play_event(event: String) -> void:
	if muted: return
	var effect := effect_for(event)
	if effect == "": return
	var player := impact_player if effect == "hit" else effect_player
	player.stream = effects[effect]
	player.play()

func set_muted(value: bool) -> void:
	muted = value
	if muted:
		effect_player.stop()
		impact_player.stop()
	music_player.stream_paused = muted
	effect_player.stream_paused = muted
	impact_player.stream_paused = muted

func _exit_tree() -> void:
	for player in [music_player, effect_player, impact_player]:
		if player:
			player.stop()
			player.stream = null
