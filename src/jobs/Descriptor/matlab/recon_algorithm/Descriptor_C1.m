function Descriptor_C1(name, VF, cutL)
% ------------------------------------------------------------------------- 
% Function used:
% overlap_particle_calc.m
% area_stat.m
% faster_elongation.m
% Transform.m
% -------------------------------------------------------------------------
disp('Preprocessing the image. It may take several minutes.')
disp('Manual IMAGEJ operation is needed after this step ...')
image = imread([name, '.tif']);  % The image used in previous image analysis, 330-60-100-0
image = double(image);

if cutL > length(image);
    cutL = length(image);
end

image = image(1:cutL,1:cutL);

img = medfilt2(image, [10 10]);

image_f = medfilt2(image, [50 50]);

L = length(image);

img = img - image_f;
[~, Bimg] = Transform(img, 1-VF);    
Bimg = abs( Bimg/255 - 1 );

GBimg = Bimg .* double( image );  % overlay gray scale and binary image
GBimg = uint8(GBimg);

imwrite(GBimg,[ name, '_GB_double_filter.tif'] );

