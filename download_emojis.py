import json
import urllib.request

url = "https://raw.githubusercontent.com/github/gemoji/master/db/emoji.json"
try:
    response = urllib.request.urlopen(url)
    data = json.loads(response.read().decode('utf-8'))
    
    categories = {
        'smileys': [],
        'people': [],
        'animals': [],
        'food': [],
        'travel': [],
        'activities': [],
        'objects': [],
        'symbols': [],
        'flags': []
    }
    
    cat_map = {
        'Smileys & Emotion': 'smileys',
        'People & Body': 'people',
        'Animals & Nature': 'animals',
        'Food & Drink': 'food',
        'Travel & Places': 'travel',
        'Activities': 'activities',
        'Objects': 'objects',
        'Symbols': 'symbols',
        'Flags': 'flags'
    }
    
    for item in data:
        if 'category' in item and item['category'] in cat_map and 'emoji' in item:
            cat = cat_map[item['category']]
            categories[cat].append(item['emoji'])
            
    with open('public/js/emojis.js', 'w', encoding='utf-8') as f:
        f.write("const EMOJI_DATA = ")
        json.dump(categories, f, ensure_ascii=False)
        f.write(";")
    
    print("Emojis written successfully!")
except Exception as e:
    print(f"Error: {e}")
