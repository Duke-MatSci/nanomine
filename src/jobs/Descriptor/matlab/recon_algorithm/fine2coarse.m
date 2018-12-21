function [ img, Bimg ] = fine2coarse(image, scale)
% This function combines the voxels of a large finescale structure together
% to obtain a smaller coarsescale structure.
% Written by Hongyi Xu, modified by Xiaolin Li
% Inputs:
% image: the fine scale binary image, cube, 1 for filler, 0 for matrix
% scale: the desired size for the voxelated model
% Outputs:
% img: the rescaled greyscale image
% Bimg: the rescaled binary image
L = length(image); % image size of the fine mesh image
VF = sum( sum( sum(image) ) )/L^3;
LL = scale;% the rescaled image size
scale = LL/L;
%================== find lowest common multiple ==================%
F_size = lcm(L,LL);

%================== enlarge the original image, make its size to F_size ==%
Fimg = zeros(F_size, F_size, F_size);
mul = F_size / L; %on each dimension, an original voxel will be expanded to mul voxels
fill = ones(mul, mul, mul); % a filler block to match the orginial voxel
for i = 1: L
    for j = 1: L
        for k = 1:L
           if image(i,j,k) == 1
               Fimg((i-1)*mul+1:i*mul, (j-1)*mul+1:j*mul, (k-1)*mul+1:k*mul) = fill;
           end
        end
    end
end
image = Fimg;


%num = round(1/scale);
%num = round(1/scale);
num = F_size / LL;
L = F_size; 
img = zeros(LL,LL,LL);

xx = 0;
yy = 0;
zz = 0;

for ii = 1:num:L
%     ii
    xx = xx+1;
    yy = 0;
    for jj = 1:num:L
        
        yy = yy+1;
        zz = 0;
        for kk = 1:num:L
            
            zz = zz+1;
            [ii jj kk num L];
            img(xx,yy,zz) = sum( sum( sum( image( ii:min(ii+num-1,L) , jj:min(jj+num-1,L), kk:min(kk+num-1,L) ) ) ) );
                
        end
        
    end
end

VFlist = img(:);
lower = min(VFlist);
upper = max(VFlist);
NN = length(VFlist);

for ii = lower:1:upper-1 %determine threshold
    
    threshold1 = sum( VFlist > ii );
    threshold2 = sum( VFlist > ii + 1 );
    if threshold1 >= VF*NN && threshold2 <=VF*NN
        break;
    end
end

Bimg = img > ii;
Bimg = double(Bimg);

img = img/(1/scale)^3;


temp_img = Bimg;
L = length(Bimg);

AN = VF*L^3 - sum(sum(sum(temp_img)));  % AN: add number

if AN > 0  % Need add "1" voxels
    
    cnt = 0;
    flg = 0;
    while 1
        
        C = find_edge_0_3D(temp_img);
        no_list = randperm( size(C,1) );
        
        for ii = 1:1:size(C,1)
            
            no = no_list(ii);
            x = C(no,1);
            y = C(no,2);
            z = C(no,3);
            temp_img(x,y,z) = 1;
            cnt = cnt + 1;
            
            if cnt >= AN
                flg = 1;
                break;
            end
            
        end
        
        if flg
            break;
        end
        
    end
    
else  % Need add "0" voxels
    
    AN = abs(AN);   
    cnt = 0;
    flg = 0;
    while 1
        
        C = find_edge_1_3D(temp_img);
        no_list = randperm( size(C,1) );
        
        for ii = 1:1:size(C,1)
            
            no = no_list(ii);
            x = C(no,1);
            y = C(no,2);
            z = C(no,3);
            temp_img(x,y,z) = 0;
            cnt = cnt + 1;
            
            if cnt >= AN
                flg = 1;
                break;
            end
        end
        
        if flg
            break;
        end

    end
    
end

Bimg = temp_img;  % img is the final product

