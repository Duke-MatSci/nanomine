function Cl_corr=C2(O_image)

[M,N]=size(O_image);
if M~=N
    error('the images should be square')
end
pixel = size(O_image,1);
BinCntr = 0:pixel/2+1;

pnt_num = pixel*pixel;
pnt_loc = zeros(pnt_num,2);
Count = 1;
for j = 1:pixel
    for i = 1:pixel
        pnt_loc(Count,:) = [i,j]; Count = Count+1;
    end
end

Freq2D = zeros(1,length(BinCntr));
% parpool('local',16)
parfor i = 1:pnt_num
    dist = zeros(1,pnt_num-i+1);
    for j = i+1:pnt_num
        dx = abs(pnt_loc(i,1)-pnt_loc(j,1));
        dy = abs(pnt_loc(i,2)-pnt_loc(j,2));
        if dx>=pixel/2; dx = pixel-dx; end;
        if dy>=pixel/2; dy = pixel-dy; end;
        dist(j-i+1) = sqrt(dx*dx+dy*dy);
    end
    Freq2D = Freq2D + hist(dist,BinCntr);
end
% delete(gcp('nocreate'))


CC = bwconncomp(O_image,4);
CorrCls = zeros(1,length(BinCntr));
for iCluster = 1:CC.NumObjects
    [x,y] = ind2sub(CC.ImageSize,CC.PixelIdxList{iCluster});
    pnt_loc = [x y];
    pnt_num = size(pnt_loc,1);
    for i = 1:pnt_num
        dist = zeros(1,pnt_num-i+1);
        for j = i+1:pnt_num
            dx = abs(pnt_loc(i,1)-pnt_loc(j,1));
            dy = abs(pnt_loc(i,2)-pnt_loc(j,2));
            dist(j-i+1) = sqrt(dx*dx+dy*dy);
        end
        CorrCls = CorrCls + hist(dist,BinCntr);
    end
end
Cl_corr = transpose(CorrCls./Freq2D);