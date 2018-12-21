% Xiaolin Li
% test the impact of resolution on the percentage of 1st layer interphase
clear all;
load('./sample_binary_input_results_180/sample_binary_input_coarsen_recon.mat');
L = length(Bimg_coarse(1,1,:));
unit_l = 20;
sampling_num = 10000;
num_filler = zeros(1,sampling_num);
k = 8; % number of interphase layers
num_intph = zeros(k,sampling_num);

for n = 1 : sampling_num %sampling * 20 
    xs = unidrnd(L-unit_l+1,1,3);
    Bimg = Bimg_coarse(xs(1):xs(1)+ unit_l - 1, xs(2):xs(2) + unit_l -1, xs(3):xs(3) + unit_l -1);
    num_filler(n) = sum(Bimg(:));
    for ii = 1:k
        list1 = find_edge_0_3D(Bimg);
        num_intph(ii,n) = length(list1);
        for m = 1: length(list1(:,1))
            Bimg(list1(m,1),list1(m,2),list1(m,3)) = 1;
        end
    end
    
end

mean(num_filler)
for ii = 1:k
    temp = [ii mean(num_intph(ii,:))];
end
for jj = 1:sampling_num
    if num_filler(jj)/20/20/20 > 0.195
        if num_filler(jj)/20/20/20 < 0.205
            jj
            break;
        end
    end
end
num_filler(jj)
num_intph(:,jj)
