function lcorr = linearpath(image)
% -------------------------------------------------------------------------
% Written by Hongyi Xu, 4/27/2013
% This function evaluate the linear path correlation of the "1" phase of a
% binary 2D image
% Inputs:
% image: binary image, the phase to be characterized is "1". The column
% direction is characterized. The size of the image is L X L
% Outputs:
% lcorr: linear path correlation function
% -------------------------------------------------------------------------
image = double(image);
image=rot90(image);
L = length(image);
lcorr1 = zeros(L,1);
lcorr2 = zeros(L,1);

FC = L:-1:1;
FC = FC(:) * L;

for ii = 1:1:L  % Go through all the columns
    
    clm1 = image(:,ii);
    clm2 = image(ii,:);
    clm1 = bwlabel(clm1);
    clm2 = bwlabel(clm2);
    maxnum1 = max(clm1);
    maxnum2 = max(clm2);
        
    if maxnum1 > 0
        for jj = 1:1:maxnum1

            cnt1 = sum( clm1==jj );
            for kk = 1:1:cnt1
                lcorr1(kk) = lcorr1(kk) + cnt1 - kk + 1;
            end

        end
    end
    if maxnum2 > 0
        for jj = 1:1:maxnum2

            cnt2 = sum( clm2==jj );
            for kk = 1:1:cnt2
                lcorr2(kk) = lcorr2(kk) + cnt2 - kk + 1;
            end

        end
    end
    
end

lcorr = (lcorr1+lcorr2)/2./FC;
