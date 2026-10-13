/** Stock photo per food category - shared by the browse cards and the home preview. */
export const CATEGORY_IMAGE = {
  "Cooked Meals": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80",
  Bakery: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80",
  Vegetables: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&auto=format&fit=crop&q=80",
  Dairy: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400&auto=format&fit=crop&q=80",
  Fruits: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&auto=format&fit=crop&q=80",
  "Packaged Goods": "https://images.unsplash.com/photo-1584473457406-6240486418e9?w=400&auto=format&fit=crop&q=80",
  Other: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&auto=format&fit=crop&q=80",
};

export const imageFor = (category) => CATEGORY_IMAGE[category] || CATEGORY_IMAGE.Other;
