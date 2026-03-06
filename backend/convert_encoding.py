try:
    with open('test_output.txt', 'r', encoding='utf-16') as f:
        content = f.read()
    with open('test_output_utf8.txt', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Conversion successful")
except Exception as e:
    print(f"Conversion failed: {e}")
