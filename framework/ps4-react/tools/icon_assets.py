# SPDX-License-Identifier: GPL-3.0-only
"""Raster equivalents of the store's navigation/control icons, baked offline."""
import math
from PIL import Image, ImageDraw


def icons():
    output=[]
    for name in ['heart','heart-filled','search','settings','download','info','back','play','pause','close','library','check']:
        image=Image.new('RGBA',(96,96));draw=ImageDraw.Draw(image)
        def line(points):draw.line([(x*4,y*4) for x,y in points],fill='white',width=7,joint='curve')
        if name.startswith('heart'):
            points=[]
            for i in range(201):
                t=2*math.pi*i/200
                points.append((48+2.4*16*math.sin(t)**3,43-2.4*(13*math.cos(t)-5*math.cos(2*t)-2*math.cos(3*t)-math.cos(4*t))))
            if name=='heart-filled':draw.polygon(points,fill='white')
            else:draw.line(points,fill='white',width=6,joint='curve')
        elif name=='search':draw.ellipse((16,16,68,68),outline='white',width=7);line([(16,16),(21,21)])
        elif name=='settings':
            points=[((12+(9 if i%2==0 else 7)*math.cos(i*math.pi/8))*4,(12+(9 if i%2==0 else 7)*math.sin(i*math.pi/8))*4) for i in range(17)]
            draw.line(points,fill='white',width=6,joint='curve');draw.ellipse((35,35,61,61),outline='white',width=6)
        elif name=='download':line([(12,3),(12,15),(7,10)]);line([(12,15),(17,10)]);line([(4,17),(4,21),(20,21),(20,17)])
        elif name=='info':draw.ellipse((12,12,84,84),outline='white',width=6);line([(12,11),(12,17)]);line([(12,7),(12,8)])
        elif name=='back':line([(10,5),(3,12),(10,19)]);line([(3,12),(21,12)])
        elif name=='play':line([(8,4),(20,12),(8,20),(8,4)])
        elif name=='pause':line([(8,5),(8,19)]);line([(16,5),(16,19)])
        elif name=='close':line([(6,6),(18,18)]);line([(6,18),(18,6)])
        elif name=='check':line([(5,12),(9,16),(20,5)])
        elif name=='library':line([(4,4),(4,20),(9,20),(9,4),(4,4)]);line([(13,5),(18,4),(21,19),(16,20),(13,5)])
        output.append(('icon-'+name,image))
    return output
