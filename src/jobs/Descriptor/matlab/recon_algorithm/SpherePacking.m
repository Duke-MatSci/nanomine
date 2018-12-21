function PClist = SpherePacking(img, r)
% img is a binary 3D voxel image
% r is the radius of the spheres (suppose that all particles are equal
% size)
% PClist is the list of primary particle centers

L = length(img);

V = sum( img(:) );
VF = V / L^3;

NN = L^3 / (pi*r^2);

list = rand([NN,3]);
list = list * L;

% PClist = zeros(NN,3);
% cnt = 1;

for ii = 1:1:NN
    
    if mod(ii,100000) == 0
        disp(NN-ii)
    end
    
    x = max( 1, round( list(ii,1) ) );
    y = max( 1, round( list(ii,2) ) );
    z = max( 1, round( list(ii,3) ) );
    
    if img(x,y,z) == 0
        
        list(ii,1) = NaN;
        list(ii,2) = NaN;
        list(ii,3) = NaN;
%         PClist(cnt, 1) = list(ii,1);
%         PClist(cnt, 2) = list(ii,2);
%         PClist(cnt, 3) = list(ii,3);
%         cnt = cnt+1;
    end
    
end

k = list(:,1);
PClist(:,1) = k( ~isnan(k) ) ;

k = list(:,2);
PClist(:,2) = k( ~isnan(k) ) ;

k = list(:,3);
PClist(:,3) = k( ~isnan(k) ) ;