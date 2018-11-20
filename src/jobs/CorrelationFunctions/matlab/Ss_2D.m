function corrf = Ss_2D(img)

image = double(img);
%image = img;
%pixel = length(image);
pixel_x = size(image,1); pixel_y = size(image,2);
% find the locations of edges
image_ext = zeros([pixel_x+2 pixel_y+2]); % expanded image
image_ext(2:pixel_x+1,2:pixel_y+1) = image;
image_tmp = 4*image - image_ext(1:pixel_x,2:pixel_y+1) - ...
                       image_ext(3:pixel_x+2,2:pixel_y+1)...
                    - image_ext(2:pixel_x+1,1:pixel_y) - image_ext(2:pixel_x+1,3:pixel_y+2);

% in image_tmp
% +: "1" edge
% -: "0" edge
% 0: white/black interior
img_1_edge = (image_tmp > 0);
img = double(img_1_edge);
image = img;
L_x = size(image,1);
L_y = size(image,2);
L = max(size(image));
VF = sum( image(:) )/(L_x*L_y);
clear image


R = floor( L/2 );
count = zeros(R+1,1);
Bn = zeros(R+1,1);

img = img - ( mean( mean(img) ) );
F = fftn(img);
c = fftshift(ifftn(F.*conj(F)));

maxV = ( max( max(c) ) );
[ic, jc] = ind2sub( size(img),find(c == maxV) );

for i = 1:1:L_x
    for j = 1:1:L_y
        
            r = round( sqrt((i-ic)^2 + (j-jc)^2)); % r is the distances between a given point and the max value point(peak).
            if r<=R   % this constraints is to confine the counting range into a circle which has the radius of R, and centered at the peak
                Bn(r+1) = Bn(r+1) + c(i,j);  % add all the value of the pixels together, which are located on the same circle centered at the peak
                count(r+1) = count(r+1) +1;  % also count the number of the pixels located on the same circle. It should be monotone increasing.
            end
        
    end
end

Bn = Bn./count; % calculate the average value of each Bn(average value of the pixels located on the same circle)
corrf = Bn./maxV; 

LL = length(corrf);
realcorr = VF^2 + (VF - VF^2) ./ ( corrf(1) - corrf(LL) ) .* ( corrf - corrf(LL) );
corrf = realcorr;
