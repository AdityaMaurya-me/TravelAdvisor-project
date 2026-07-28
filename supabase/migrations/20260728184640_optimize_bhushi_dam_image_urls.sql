-- Serve responsive Wikimedia thumbnail variants instead of original files.
-- The underlying images and attribution remain unchanged.
with bhushi_images(original_url, thumbnail_url) as (
  values
    ('https://upload.wikimedia.org/wikipedia/commons/e/e9/Bhushi_dam.JPG', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Bhushi_dam.JPG/1280px-Bhushi_dam.JPG'),
    ('https://upload.wikimedia.org/wikipedia/commons/7/72/Bhushi_Dam_-_Lonavala.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Bhushi_Dam_-_Lonavala.jpg/1280px-Bhushi_Dam_-_Lonavala.jpg'),
    ('https://upload.wikimedia.org/wikipedia/commons/9/9d/Bhushi_Dam.JPG', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Bhushi_Dam.JPG/1280px-Bhushi_Dam.JPG'),
    ('https://upload.wikimedia.org/wikipedia/commons/b/b0/BhushiDam.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/BhushiDam.jpg/1280px-BhushiDam.jpg'),
    ('https://upload.wikimedia.org/wikipedia/commons/3/31/Bhushi_Dam_an_anotherview_%2C_Lonovala.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Bhushi_Dam_an_anotherview_%2C_Lonovala.jpg/1280px-Bhushi_Dam_an_anotherview_%2C_Lonovala.jpg'),
    ('https://upload.wikimedia.org/wikipedia/commons/4/47/Bhushi_Dam_an_anotherview_%2C_Lonovala_2.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Bhushi_Dam_an_anotherview_%2C_Lonovala_2.jpg/1280px-Bhushi_Dam_an_anotherview_%2C_Lonovala_2.jpg')
)
update public.places as place
set cover_image = images.thumbnail_url
from bhushi_images as images
where place.slug = 'bhushi-dam'
  and place.cover_image = images.original_url;

with bhushi_images(original_url, thumbnail_url) as (
  values
    ('https://upload.wikimedia.org/wikipedia/commons/e/e9/Bhushi_dam.JPG', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Bhushi_dam.JPG/1280px-Bhushi_dam.JPG'),
    ('https://upload.wikimedia.org/wikipedia/commons/7/72/Bhushi_Dam_-_Lonavala.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Bhushi_Dam_-_Lonavala.jpg/1280px-Bhushi_Dam_-_Lonavala.jpg'),
    ('https://upload.wikimedia.org/wikipedia/commons/9/9d/Bhushi_Dam.JPG', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Bhushi_Dam.JPG/1280px-Bhushi_Dam.JPG'),
    ('https://upload.wikimedia.org/wikipedia/commons/b/b0/BhushiDam.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/BhushiDam.jpg/1280px-BhushiDam.jpg'),
    ('https://upload.wikimedia.org/wikipedia/commons/3/31/Bhushi_Dam_an_anotherview_%2C_Lonovala.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Bhushi_Dam_an_anotherview_%2C_Lonovala.jpg/1280px-Bhushi_Dam_an_anotherview_%2C_Lonovala.jpg'),
    ('https://upload.wikimedia.org/wikipedia/commons/4/47/Bhushi_Dam_an_anotherview_%2C_Lonovala_2.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Bhushi_Dam_an_anotherview_%2C_Lonovala_2.jpg/1280px-Bhushi_Dam_an_anotherview_%2C_Lonovala_2.jpg')
)
update public.place_images as image
set url = images.thumbnail_url
from public.places as place,
     bhushi_images as images
where image.place_id = place.id
  and place.slug = 'bhushi-dam'
  and images.original_url = image.url;
