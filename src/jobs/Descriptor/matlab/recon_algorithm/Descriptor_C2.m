function Descriptor_C2(name, VF, recon_length)
% Descriptor-based characterization of the 500 size microstructure image
% The "double filter" technique is used here
% May 16, 2013, Hongyi Xu
% Inputs
% img_name:         name of the image (without suffix). It will be used as part of the reconstruction's name as well
% VF:               volume fraction
% recon_length:     the side length of the reconstruction (in voxel)
% 
% ------------------------------------------------------------------------- 
% Function used:
% overlap_particle_calc.m
% area_stat.m
% faster_elongation.m
% Transform.m
% -------------------------------------------------------------------------

%% Phase II: find the local maxima using imageJ
% =========================================================================
% Operation of imageJ, +1, get "8_330-60-50_007_GB_double_filter_cl.mat"
% =========================================================================

%% Phase III: characterization
disp('Now start 2D characterization ...')

img = imread([name, '_GB_double_filter.tif']);

cl = dlmread('cllist.txt', '\t', 1, 1);   % Read in data, from Row 2, Column 2
cl = cl + 1; 
% get cl. cl(:,2) is x, cl (:,1) is y

% Evaluate the nearest distance
N = length(cl);

nd = [];
for ii = 1:N
    
    if mod(ii,1000) == 0
        disp(N-ii)
    end
    
    expand_c = repmat( cl(ii,:) , [N , 1] );
    distances = (cl - expand_c).^2;
    distances = sum( distances , 2);
    distances = distances.^0.5;
    distances = sort(distances,'ascend');
    nd = [ nd; distances(2) ];

end

clear ii expand_c distances

Clist = [ cl(:,2), cl(:,1) ];

img = imread([ name,'_GB_double_filter.tif'] );
img = double(img);
img = ceil(img/1000);
[areas, el, ellist, ~, ~] = overlap_particle_calc( img , Clist );

L = 1500;
Bimg = img;

num = length(cl); 
rc_mean = sqrt( L^2 * VF / num / pi )

Els = 1./ellist; 
num_3D = num * recon_length / (rc_mean*2)

save( [ name, '_GB_double_filter_2D_results.mat' ] )
% return
%% Phase IV: 3D Descriptor prediction
clearvars -except name 
clc
disp('Now predicting 3D descriptors ...')

load( [ name, '_GB_double_filter_2D_results.mat' ] )

% -------------------------------------------------------------------------
% Adjust the aspect ratio
% -------------------------------------------------------------------------

load Table_As_2D3D_depth

thickness = ceil( rc_mean*2 );
Els = 1./ellist; 
Areas = areas; 
clear As

% sortEls = sort(Els, 'ascend');
% upperEl = sortEls( length(Els) - 5 );
% lowerEl = sortEls( 1 + 5 );

As3D = 1:0.01:5;
theta = 0:pi/2*0.002:(pi/2);

As3D_predict = zeros( length(Els), 1 );

for ii = 1:1:length(Els)
    
    As2D = Els(ii);
%     if As2D > upperEl
%         continue;
%     end
    [a b] = find( abs( Table_As_23D - As2D )< 0.003 ); % a is 3D As; b is rotation angle;
    
    area2D = Areas(ii);
    rs2D = sqrt( area2D/pi/As2D );  % Short radius
    
    pos_list = [];  % Possible 3D list
    
    if rs2D * 2 >= thickness
        
        pos_list = As2D;
        
    else
    
        for jj = 1:1:length(a)

            xx = a(jj);  % xx is 3D As
            yy = b(jj);  % yy is rotation angle

            if Table_depth( xx, yy ) * rs2D < thickness  && rs2D < thickness  % The depth constraint
                pos_list = [ pos_list; As3D(xx) ];  % The possible 3D As
            end

        end
    
    end
    
    As3D_predict(ii) = mean(pos_list);
    
end

As3D_pred_adjust = [];
for ii = 1:1:length( As3D_predict )
    if As3D_predict(ii) >= 1
        As3D_pred_adjust = [ As3D_pred_adjust; As3D_predict(ii) ];
    end
end

Predict_3D_As_mean = mean(As3D_pred_adjust)
Predict_3D_As_var = var(As3D_pred_adjust)

% -------------------------------------------------------------------------
% Adjust the nearest distance
% -------------------------------------------------------------------------
Ndall = nd;
D = ceil( rc_mean*2 );  % thickness

prediND_3D = zeros( length(Ndall), 1 );

for ii = 1:1:length(Ndall)
    
    nd_2D = Ndall(ii);
    
    if nd_2D <= D
    
        posiND_3D1 = [];  % Possible nd in 3D space
        posiND_3D2 = [];  % Possible nd in 3D space
        for theta = 0:pi/2*0.002:pi/2

            nd_3D = nd_2D / cos(theta);
            
            if nd_2D * tan(theta) <= D/4
                posiND_3D1 = [ posiND_3D1; nd_3D ];
            end
            
            if nd_2D * tan(theta) <= D*3/4
                posiND_3D2 = [ posiND_3D2; nd_3D ];
            end            
            
            if nd_2D * tan(theta) > D*3/4
                break;
            end

        end
                
        prediND_3D(ii) = mean(posiND_3D1) + mean(posiND_3D2);
        prediND_3D(ii) = prediND_3D(ii) / 2;
        
    else
        
        prediND_3D(ii) = nd_2D;
        
    end
    
end

ND2D = [ sum(Ndall < 3) sum(Ndall < 5) sum(Ndall < 7.5) sum(Ndall < 10) sum(Ndall < 12.5) sum(Ndall < 15) ]/length(Ndall)
ND3D = [ sum(prediND_3D < 3) sum(prediND_3D < 5) sum(prediND_3D < 7.5) sum(prediND_3D < 10) sum(prediND_3D < 12.5) sum(prediND_3D < 15) ]/length(Ndall)

save( [ name, '_GB_double_filter_3D_results.mat' ] )

disp('3D descirptor prediction is done!')