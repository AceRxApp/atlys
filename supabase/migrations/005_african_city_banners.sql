-- Migration: Add banner images for African cities
-- Unsplash free-to-use images (Unsplash License)

-- North Africa
UPDATE cities SET banner_url = 'https://images.unsplash.com/photo-1658996403259-5a2dd3efc6fa?w=800&h=300&fit=crop&q=80' WHERE slug = 'algiers';
UPDATE cities SET banner_url = 'https://images.unsplash.com/photo-1760973566831-4d029dc31c3e?w=800&h=300&fit=crop&q=80' WHERE slug = 'alexandria';
UPDATE cities SET banner_url = 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=800&h=300&fit=crop&q=80' WHERE slug = 'cairo';
UPDATE cities SET banner_url = 'https://images.unsplash.com/photo-1582742850838-24590fb39fdc?w=800&h=300&fit=crop&q=80' WHERE slug = 'fez';
UPDATE cities SET banner_url = 'https://images.unsplash.com/photo-1573623473350-372f8fb84838?w=800&h=300&fit=crop&q=80' WHERE slug = 'luxor';
UPDATE cities SET banner_url = 'https://images.unsplash.com/photo-1582919534700-f987372f6fec?w=800&h=300&fit=crop&q=80' WHERE slug = 'tangier';
UPDATE cities SET banner_url = 'https://images.unsplash.com/photo-1682862841871-553ceb226b2e?w=800&h=300&fit=crop&q=80' WHERE slug = 'tunis';

-- West Africa
UPDATE cities SET banner_url = 'https://images.unsplash.com/premium_photo-1699699368327-a1887e5a6ce6?w=800&h=300&fit=crop&q=80' WHERE slug = 'bamako';
UPDATE cities SET banner_url = 'https://images.unsplash.com/photo-1646459273661-66884c54f2f1?w=800&h=300&fit=crop&q=80' WHERE slug = 'cotonou';
UPDATE cities SET banner_url = 'https://images.unsplash.com/photo-1734868419408-5dcf1cbe02a7?w=800&h=300&fit=crop&q=80' WHERE slug = 'lome';

-- East Africa
UPDATE cities SET banner_url = 'https://images.unsplash.com/photo-1624272909636-4995421e37e7?w=800&h=300&fit=crop&q=80' WHERE slug = 'antananarivo';
UPDATE cities SET banner_url = 'https://images.unsplash.com/photo-1580320239377-b19ded5536a1?w=800&h=300&fit=crop&q=80' WHERE slug = 'asmara';
UPDATE cities SET banner_url = 'https://images.unsplash.com/premium_photo-1670782711986-df3f949e30de?w=800&h=300&fit=crop&q=80' WHERE slug = 'djibouti';
UPDATE cities SET banner_url = 'https://images.unsplash.com/photo-1706089976176-3c1605f556cf?w=800&h=300&fit=crop&q=80' WHERE slug = 'victoria-seychelles';

-- Central Africa
UPDATE cities SET banner_url = 'https://images.unsplash.com/photo-1594386479412-fa62932f4cdc?w=800&h=300&fit=crop&q=80' WHERE slug = 'douala';
UPDATE cities SET banner_url = 'https://images.unsplash.com/photo-1695071622344-75bb5863bc83?w=800&h=300&fit=crop&q=80' WHERE slug = 'kinshasa';
UPDATE cities SET banner_url = 'https://images.unsplash.com/photo-1770392171006-7e852c75cc26?w=800&h=300&fit=crop&q=80' WHERE slug = 'libreville';

-- Southern Africa
UPDATE cities SET banner_url = 'https://images.unsplash.com/photo-1682065936841-6bb7f68207b7?w=800&h=300&fit=crop&q=80' WHERE slug = 'durban';
UPDATE cities SET banner_url = 'https://images.unsplash.com/photo-1591005383705-c7af6a4eedd0?w=800&h=300&fit=crop&q=80' WHERE slug = 'gaborone';
UPDATE cities SET banner_url = 'https://images.unsplash.com/photo-1670843628925-eb75619c286a?w=800&h=300&fit=crop&q=80' WHERE slug = 'harare';
UPDATE cities SET banner_url = 'https://images.unsplash.com/photo-1706364740947-2771ab0db9dd?w=800&h=300&fit=crop&q=80' WHERE slug = 'livingstone';
UPDATE cities SET banner_url = 'https://images.unsplash.com/photo-1649709176854-229664e5fd8a?w=800&h=300&fit=crop&q=80' WHERE slug = 'pretoria';
UPDATE cities SET banner_url = 'https://images.unsplash.com/photo-1586100810957-e4a1fed8c645?w=800&h=300&fit=crop&q=80' WHERE slug = 'windhoek';

-- Island Territories
UPDATE cities SET banner_url = 'https://images.unsplash.com/photo-1641422008415-843365cfe582?w=800&h=300&fit=crop&q=80' WHERE slug = 'cape-verde';
UPDATE cities SET banner_url = 'https://images.unsplash.com/photo-1651679496394-75cf1371d316?w=800&h=300&fit=crop&q=80' WHERE slug = 'reunion';
