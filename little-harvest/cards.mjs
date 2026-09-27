const entries = [
  ['apple', 'Apple', '苹果', 'fruit', '#f6d7cf'],
  ['banana', 'Banana', '香蕉', 'fruit', '#f8e9ac'],
  ['orange', 'Orange', '橙子', 'fruit', '#f8d9b1'],
  ['strawberry', 'Strawberry', '草莓', 'fruit', '#f5c9c9'],
  ['grape', 'Grape', '葡萄', 'fruit', '#ded5eb'],
  ['watermelon', 'Watermelon', '西瓜', 'fruit', '#d9eacc'],
  ['pear', 'Pear', '梨', 'fruit', '#e8e9b8'],
  ['peach', 'Peach', '桃子', 'fruit', '#f6d6c4'],
  ['pineapple', 'Pineapple', '菠萝', 'fruit', '#f7e4a4'],
  ['lemon', 'Lemon', '柠檬', 'fruit', '#f6e9ac'],
  ['cherry', 'Cherry', '樱桃', 'fruit', '#f3c8c8'],
  ['blueberry', 'Blueberry', '蓝莓', 'fruit', '#d8d8ef'],
  ['kiwi', 'Kiwi', '猕猴桃', 'fruit', '#e2e8bd'],
  ['mango', 'Mango', '芒果', 'fruit', '#f7ddad'],
  ['coconut', 'Coconut', '椰子', 'fruit', '#e9dfc8'],
  ['avocado', 'Avocado', '牛油果', 'fruit', '#dce8c7'],
  ['fig', 'Fig', '无花果', 'fruit', '#e5d2e4'],
  ['pomegranate', 'Pomegranate', '石榴', 'fruit', '#f3d2c9'],
  ['carrot', 'Carrot', '胡萝卜', 'vegetable', '#f7dec8'],
  ['tomato', 'Tomato', '番茄', 'vegetable', '#f6d2c9'],
  ['cucumber', 'Cucumber', '黄瓜', 'vegetable', '#dce9c9'],
  ['broccoli', 'Broccoli', '西兰花', 'vegetable', '#dbe9d4'],
  ['pumpkin', 'Pumpkin', '南瓜', 'vegetable', '#f4dcc3'],
  ['eggplant', 'Eggplant', '茄子', 'vegetable', '#dfd4e9'],
  ['corn', 'Corn', '玉米', 'vegetable', '#f6e8b5'],
  ['pepper', 'Bell pepper', '甜椒', 'vegetable', '#f1d9c8'],
  ['potato', 'Potato', '土豆', 'vegetable', '#eae0cd'],
  ['onion', 'Onion', '洋葱', 'vegetable', '#eadce4'],
  ['mushroom', 'Mushroom', '蘑菇', 'vegetable', '#e6ded1'],
  ['cabbage', 'Cabbage', '卷心菜', 'vegetable', '#e0e9cf'],
  ['lettuce', 'Lettuce', '生菜', 'vegetable', '#e0ebd0'],
  ['radish', 'Radish', '小萝卜', 'vegetable', '#f1d5d5'],
  ['peas', 'Peas', '豌豆', 'vegetable', '#dfe9c9'],
  ['cauliflower', 'Cauliflower', '花椰菜', 'vegetable', '#eee8d4'],
  ['spinach', 'Spinach', '菠菜', 'vegetable', '#d9e7ce'],
  ['beetroot', 'Beetroot', '甜菜根', 'vegetable', '#e7d5dd'],
];

export const cards = entries.map(([id, word, zh, category, color]) => ({ id, word, zh, category, color }));

export function visibleCards(category) {
  return category === 'all' ? cards : cards.filter(card => card.category === category);
}

export function nextIndex(index, step, count) {
  return Math.max(0, Math.min(count - 1, index + step));
}

export function swipeDirection(dx, dy) {
  if (Math.abs(dx) < 54 || Math.abs(dx) <= Math.abs(dy) * 1.15) return 0;
  return dx > 0 ? 1 : -1;
}
