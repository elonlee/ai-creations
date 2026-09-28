extends SceneTree

func _initialize() -> void:
	call_deferred("_capture")

func _capture() -> void:
	var scene: Node = load("res://scenes/main.tscn").instantiate()
	root.add_child(scene)
	for frame in range(8): await process_frame
	var path := "/tmp/changfeng-menu.png"
	for argument in OS.get_cmdline_user_args():
		if argument.begins_with("--capture="): path = argument.trim_prefix("--capture=")
	var error := root.get_texture().get_image().save_png(path)
	print("截图：%s，结果：%d" % [path, error])
	quit(error)
